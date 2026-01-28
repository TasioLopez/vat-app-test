import { NextRequest } from "next/server";
import { handleAPIError, createSuccessResponse, validateRequiredFields, validateUUID } from "@/lib/api-utils";
import { OpenAIService } from "@/lib/openai-service";
import { SupabaseService } from "@/lib/supabase-service";

// ---- Citation Stripping ----
function stripCitations(text: string): string {
  if (!text) return text;
  let cleaned = text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned;
}

function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith("documents/")) return url.slice("documents/".length);
  if (url && !url.includes("://") && !url.includes("object/")) return url;
  return null;
}

// Simple PDF text extraction
async function readPdfFromStorage(path: string): Promise<string> {
  const supabaseService = SupabaseService.getInstance();
  const supabase = supabaseService.getClient();
  const { data: file } = await supabase.storage.from("documents").download(path);
  if (!file) return "";
  const buf = Buffer.from(await file.arrayBuffer());
  
  try {
    const bufferString = buf.toString('utf8');
    const readableText = bufferString.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
    if (readableText && readableText.length > 0) {
      return readableText.join(' ');
    }
    return "";
  } catch (error: any) {
    console.error('PDF extraction failed:', error.message);
    return "";
  }
}

// Get document text by type with priority order
async function getDocTextByPriority(employeeId: string): Promise<{ text: string; source: string }> {
  const supabaseService = SupabaseService.getInstance();
  const supabase = supabaseService.getClient();
  const { data: docs } = await supabase
    .from("documents")
    .select("type,url,uploaded_at")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });
  
  if (!docs?.length) return { text: "", source: "" };

  // Priority 1: AD rapport
  const adDoc = docs.find(d => {
    const type = (d.type || "").toLowerCase();
    return type.includes("ad") || type.includes("arbeidsdeskundig");
  });
  if (adDoc?.url) {
    const path = extractStoragePath(adDoc.url);
    if (path) {
      const txt = await readPdfFromStorage(path);
      if (txt && txt.length > 50) {
        return { text: txt, source: "AD rapport" };
      }
    }
  }

  // Priority 2: FML/IZP
  const fmlDoc = docs.find(d => {
    const type = (d.type || "").toLowerCase();
    return type === "fml" || type === "izp" || type === "lab" || 
           type.includes("functiemogelijkhedenlijst") || 
           type.includes("inzetbaarheidsprofiel") ||
           type.includes("lijst arbeidsmogelijkheden");
  });
  if (fmlDoc?.url) {
    const path = extractStoragePath(fmlDoc.url);
    if (path) {
      const txt = await readPdfFromStorage(path);
      if (txt && txt.length > 50) {
        return { text: txt, source: "FML/IZP" };
      }
    }
  }

  // Priority 3: Intake form
  const intakeDoc = docs.find(d => {
    const type = (d.type || "").toLowerCase();
    return type.includes("intake");
  });
  if (intakeDoc?.url) {
    const path = extractStoragePath(intakeDoc.url);
    if (path) {
      const txt = await readPdfFromStorage(path);
      if (txt && txt.length > 50) {
        return { text: txt, source: "Intake formulier" };
      }
    }
  }

  // Priority 4: Other documents
  for (const doc of docs) {
    const type = (doc.type || "").toLowerCase();
    if (!type.includes("ad") && !type.includes("arbeidsdeskundig") &&
        type !== "fml" && type !== "izp" && type !== "lab" &&
        !type.includes("intake") &&
        !type.includes("functiemogelijkhedenlijst") &&
        !type.includes("inzetbaarheidsprofiel")) {
      const path = extractStoragePath(doc.url);
      if (path) {
        const txt = await readPdfFromStorage(path);
        if (txt && txt.length > 50) {
          return { text: txt, source: "Overig document" };
        }
      }
    }
  }

  return { text: "", source: "" };
}

// Trede definitions based on the flowchart
const TREDE_INFO = {
  1: {
    name: "Trede 1",
    description: "Geïsoleerd (< 2 uur actief binnenshuis) of Deelname aan een activiteit buitenshuis (< 2 uur)",
    doel: "Empowerment, Dagstructuur, Zelfkennis",
    doelUren: "> 2 uur per week actief (ook bij eigen werkgever) en/of traject on hold"
  },
  2: {
    name: "Trede 2",
    description: "Deelname aan een activiteit buitenshuis (< 4 uur)",
    doel: "Empowerment, Dagstructuur, Solliciteren, Beroepskeuze",
    doelUren: "> 4 uur per week actief (ook bij eigen werkgever)"
  },
  3: {
    name: "Trede 3",
    description: "Activering of spoor 1 (< 10 uur)",
    doel: "Empowerment, Dagstructuur, Solliciteren, Beroepskeuze",
    doelUren: "> 10 uur per week een activeringsplek (ook eigen werkgever)"
  },
  4: {
    name: "Trede 4",
    description: "Stage/WEP/Re-integratie spoor 1 (< 20 uur of < 50%)",
    doel: "Solliciteren, Beroepskeuze",
    doelUren: "> 20 uur per week of 50% van de contracturen"
  },
  5: {
    name: "Trede 5",
    description: "Parttime betaald werk, detachering, voorziening of eigen werkgever",
    doel: "Solliciteren, Beroepskeuze",
    doelUren: "> 50% van de contracturen (minimaal 11 uur)"
  },
  6: {
    name: "Trede 6",
    description: "Weer volledig werkzaam binnen of buiten de organisatie",
    doel: "",
    doelUren: ""
  }
};

// Sequential question evaluation
async function evaluateQuestion(
  questionNumber: number,
  question: string,
  context: string,
  previousAnswers: Array<{ question: number; answer: boolean; validated: boolean }>
): Promise<{ answer: boolean; validated: boolean; reasoning: string }> {
  const openaiService = OpenAIService.getInstance();
  
  const previousContext = previousAnswers.length > 0
    ? `Eerdere antwoorden:\n${previousAnswers.map(a => 
        `Vraag ${a.question}: ${a.answer ? 'JA' : 'NEE'} (${a.validated ? 'gevalideerd' : 'niet gevalideerd'})`
      ).join('\n')}\n\n`
    : '';

  const systemPrompt = `Je bent een expert in het analyseren van Nederlandse re-integratiedocumenten voor de PoW-meter (Perspectief op Werk meter).

BELANGRIJK: Je moet STRICT sequentieel werken. Je kunt ALLEEN naar de volgende vraag als de huidige vraag met zekerheid beantwoord kan worden op basis van de documenten.

VRAAG ${questionNumber}:
${question}

INSTRUCTIES:
1. Analyseer ALLEEN de aangeleverde documenttekst
2. Beantwoord de vraag met JA of NEE
3. Je mag ALLEEN "gevalideerd" antwoorden als je 100% zeker bent op basis van expliciete informatie in de documenten
4. Als de informatie ontbreekt, ambigu is, of niet duidelijk genoeg is, antwoord dan "niet gevalideerd"
5. Bij twijfel: antwoord "niet gevalideerd" en geef NEE als antwoord (veilige default)

Geef je antwoord via function call met:
- answer: boolean (true = JA, false = NEE)
- validated: boolean (true = zeker op basis van documenten, false = niet zeker genoeg)
- reasoning: string (korte uitleg waarom, verwijzend naar specifieke tekst in documenten)`;

  const userPrompt = `${previousContext}DOCUMENTTEKST:
${context.slice(0, 22000)}

Analyseer vraag ${questionNumber} en bepaal of deze met zekerheid beantwoord kan worden.`;

  const toolSchema = {
    type: "function" as const,
    function: {
      name: `evaluate_question_${questionNumber}`,
      description: `Evalueer vraag ${questionNumber} van de PoW-meter`,
      parameters: {
        type: "object" as const,
        properties: {
          answer: { type: "boolean" as const, description: "true = JA, false = NEE" },
          validated: { type: "boolean" as const, description: "true = zeker op basis van documenten, false = niet zeker" },
          reasoning: { type: "string" as const, description: "Korte uitleg" }
        },
        required: ["answer", "validated", "reasoning"]
      }
    }
  };

  try {
    const result = await openaiService.generateContent(
      systemPrompt,
      userPrompt,
      toolSchema,
      { temperature: 0.1, model: 'gpt-4o' }
    );

    return {
      answer: result.answer === true,
      validated: result.validated === true,
      reasoning: result.reasoning || ""
    };
  } catch (error) {
    console.error(`Error evaluating question ${questionNumber}:`, error);
    // On error, default to not validated and NO answer (safest)
    return { answer: false, validated: false, reasoning: "Fout bij evaluatie" };
  }
}

// Main function to determine trede
async function determineTrede(docText: string, source: string): Promise<{ trede: number; text: string }> {
  const questions = [
    {
      number: 1,
      text: "Zijn er benutbare mogelijkheden (zie advies/ conclusie BA)?",
      noTrede: 1,
      yesNext: 2
    },
    {
      number: 2,
      text: "Komt men regelmatig het huis uit (2x per week)? Denk aan: geen contact buitenshuis, behalve functionele contacten zoals een bezoek aan de huisarts of fysiotherapeut",
      noTrede: 1,
      yesNext: 3
    },
    {
      number: 3,
      text: "Heeft men minimaal 2x per week activiteiten/ sociale contacten buitenshuis? Denk aan: wekelijks contact met anderen buitenshuis, zoals het deelnemen aan een koffieochtend of het volgen van een cursus of taallessen.",
      noTrede: 2,
      yesNext: 4
    },
    {
      number: 4,
      text: "Is men gemotiveerd om aan het werk te gaan? Staat men hiervoor open, is het een kwestie van niet willen of niet kunnen, zijn er factoren waar werknemer gedemotiveerd van raakt?",
      noTrede: 3,
      yesNext: 5
    },
    {
      number: 5,
      text: "Kan men op het moment van de intake minimaal 12 uur per week werken? (geen urenbeperking) Denk aan: deelname aan activiteiten met uitvoering van taken met een lage werkdruk en/of met weinig eigen verantwoordelijkheid en/of zelfstandigheid.",
      noTrede: 3,
      yesNext: 6
    },
    {
      number: 6,
      text: "Kan men zonder opleiding direct aan het werk? Denk aan: onbetaald werk, gericht op werk. Voert zelfstandig taken uit en/of draagt verantwoordelijkheid en/of opbrengst heeft economische waarde; en/of volgt een beroepsopleiding richting passend arbeid?",
      noTrede: 4,
      yesNext: 7
    },
    {
      number: 7,
      text: "Kan een functie zonder aanpassingen, aanvulling inkomen/uitkering) of voorzieningen (werkplek, taakaanpassing) etc. uitgevoerd worden? Is werknemer voor minimaal 65% hersteld gemeld in eigen of andere functie in spoor 1 of kan men minimaal 65% loonwaarde ergens anders in een passende functie genereren?",
      noTrede: 5,
      yesNext: 6
    }
  ];

  const previousAnswers: Array<{ question: number; answer: boolean; validated: boolean }> = [];

  // Evaluate questions sequentially
  for (const q of questions) {
    const evaluation = await evaluateQuestion(q.number, q.text, docText, previousAnswers);
    
    previousAnswers.push({
      question: q.number,
      answer: evaluation.answer,
      validated: evaluation.validated
    });

    // If question cannot be validated, stop and default to Trede 1
    if (!evaluation.validated) {
      console.log(`Question ${q.number} not validated, defaulting to Trede 1`);
      const tredeInfo = TREDE_INFO[1 as keyof typeof TREDE_INFO];
      return {
        trede: 1,
        text: `Werknemer bevindt zich op het moment van de intake in ${tredeInfo.name} (${tredeInfo.description}) van de PoW-meter. De verwachting is dat werknemer binnen nu en [X] maanden de stap naar een hogere trede zal maken.`
      };
    }

    // If answer is NO, return the corresponding trede
    if (!evaluation.answer) {
      const tredeKey = q.noTrede as keyof typeof TREDE_INFO;
      const tredeInfo = TREDE_INFO[tredeKey];
      const nextTrede = q.noTrede < 6 ? q.noTrede + 1 : 6;
      const nextTredeKey = nextTrede as keyof typeof TREDE_INFO;
      const nextTredeInfo = TREDE_INFO[nextTredeKey];
      
      let expectationText = "";
      if (q.noTrede === 6) {
        expectationText = "Werknemer is volledig werkzaam binnen of buiten de organisatie.";
      } else {
        expectationText = `De verwachting is dat werknemer binnen nu en [X] maanden de stap naar ${nextTredeInfo.name} (${nextTredeInfo.description}) zal maken.`;
      }

      return {
        trede: q.noTrede,
        text: `Werknemer bevindt zich op het moment van de intake in ${tredeInfo.name} (${tredeInfo.description}) van de PoW-meter. ${expectationText}`
      };
    }

    // If answer is YES, continue to next question
    // (loop continues)
  }

  // If all questions answered YES, it's Trede 6
  const tredeInfo = TREDE_INFO[6 as keyof typeof TREDE_INFO];
  return {
    trede: 6,
    text: `Werknemer bevindt zich op het moment van de intake in ${tredeInfo.name} (${tredeInfo.description}) van de PoW-meter. Werknemer is volledig werkzaam binnen of buiten de organisatie.`
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    
    validateRequiredFields({ employeeId }, ['employeeId']);
    validateUUID(employeeId!, 'Employee ID');

    // Get document text with priority order
    const { text: docText, source } = await getDocTextByPriority(employeeId!);
    
    if (!docText || docText.length < 50) {
      return createSuccessResponse(
        { pow_meter: "" },
        "Geen documenten gevonden of documenten bevatten onvoldoende tekst"
      );
    }

    console.log(`📄 Analyzing PoW-meter using ${source}`);

    // Determine trede through sequential evaluation
    const { trede, text } = await determineTrede(docText, source);

    const pow_meter = stripCitations(text);

    // Persist to database
    const supabaseService = SupabaseService.getInstance();
    await supabaseService.upsertTPMeta(employeeId!, { pow_meter });

    const tredeKey = trede as 1 | 2 | 3 | 4 | 5 | 6;
    return createSuccessResponse(
      { pow_meter },
      `PoW-meter successfully determined: ${TREDE_INFO[tredeKey].name}`
    );
  } catch (error: any) {
    return handleAPIError(error);
  }
}

