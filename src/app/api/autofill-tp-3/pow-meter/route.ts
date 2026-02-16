import { NextRequest } from "next/server";
import { handleAPIError, createSuccessResponse, validateRequiredFields, validateUUID } from "@/lib/api-utils";
import { SupabaseService } from "@/lib/supabase-service";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

// Extract specific section from intake form using AI
async function extractIntakeSection(employeeId: string, sectionName: string): Promise<string | null> {
  const supabaseService = SupabaseService.getInstance();
  const supabase = supabaseService.getClient();
  const { data: docs } = await supabase
    .from("documents")
    .select("type, url, uploaded_at")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });
  
  if (!docs?.length) return null;
  
  const variants = ["intakeformulier", "intake-formulier", "intake"];
  const intakeDoc = docs.find(d => {
    const type = (d.type || "").toLowerCase();
    return variants.some(v => type.includes(v));
  });
  
  if (!intakeDoc?.url) return null;
  
  const path = extractStoragePath(intakeDoc.url);
  if (!path) return null;
  
  try {
    // Download and upload to OpenAI
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) return null;
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = path.split('/').pop() || 'intake.pdf';
    const mimeType = fileName.endsWith('.docx') 
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      : 'application/pdf';
    
    const uploadedFile = await openai.files.create({
      file: new File([buffer], fileName, { type: mimeType }),
      purpose: "assistants"
    });
    
    // Use assistant to extract specific section
    const assistant = await openai.beta.assistants.create({
      name: "Intake Section Extractor",
      instructions: `Je bent een expert in het extracten van specifieke secties uit Nederlandse intake formulieren.
      
Extract ALLEEN de sectie "${sectionName}" uit het intake formulier.
- Geef de VOLLEDIGE tekst van deze sectie terug
- Behoud de originele structuur en formatting
- Als de sectie niet gevonden wordt, retourneer "NIET_GEVONDEN"`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: `Extract de sectie "${sectionName}" uit dit intake formulier.`,
        attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
      }]
    });
    
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });
    
    if (run.status !== 'completed') {
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      return null;
    }
    
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0]?.content?.[0];
    
    let extractedText = null;
    if (response?.type === 'text') {
      extractedText = response.text.value;
      if (extractedText.includes("NIET_GEVONDEN")) {
        extractedText = null;
      }
    }
    
    // Cleanup
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    
    return extractedText;
  } catch (error: any) {
    console.error(`⚠️ Failed to extract section "${sectionName}":`, error.message);
    return null;
  }
}

// Get documents by priority order (same pattern as zoekprofiel)
async function listEmployeeDocumentsByPriority(employeeId: string): Promise<Array<{ type: string; url: string; path: string }>> {
  const supabaseService = SupabaseService.getInstance();
  const supabase = supabaseService.getClient();
  const { data: docs } = await supabase
    .from("documents")
    .select("type,url,uploaded_at")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });
  
  if (!docs?.length) return [];

  // Document priority: Intake > AD rapport > FML/IZP > Others
  // Intake is prioritized for PoW-meter because spoor is usually found there
  const priorityOrder: { [key: string]: number } = {
    'intakeformulier': 1,
    'intake': 1,
    'ad_rapportage': 2,
    'ad_rapport': 2,
    'arbeidsdeskundig': 2,
    'fml': 3,
    'izp': 3,
    'lab': 3,
    'functiemogelijkhedenlijst': 3,
    'inzetbaarheidsprofiel': 3,
    'lijst arbeidsmogelijkheden': 3,
  };

  const sortedDocs = docs
    .map(doc => {
      const type = (doc.type || "").toLowerCase();
      let priority = 99;
      for (const [key, value] of Object.entries(priorityOrder)) {
        if (type.includes(key)) {
          priority = value;
          break;
        }
      }
      return { ...doc, priority };
    })
    .sort((a, b) => a.priority - b.priority);

  const result: Array<{ type: string; url: string; path: string }> = [];
  for (const doc of sortedDocs) {
    const path = extractStoragePath(doc.url as string);
    if (path) {
      result.push({
        type: doc.type as string,
        url: doc.url as string,
        path,
      });
    }
  }

  return result;
}

async function uploadDocsToOpenAI(docs: Array<{ type: string; path: string }>): Promise<string[]> {
  const supabaseService = SupabaseService.getInstance();
  const supabase = supabaseService.getClient();
  const fileIds: string[] = [];
  
  for (const doc of docs) {
    try {
      const { data: file } = await supabase.storage.from("documents").download(doc.path);
      if (!file) continue;
      
      const buf = Buffer.from(await file.arrayBuffer());
      const fileName = doc.path.split('/').pop() || 'doc.pdf';
      const mimeType = fileName.endsWith('.docx') 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        : 'application/pdf';
      
      const uploaded = await openai.files.create({
        file: new File([buf], fileName, { type: mimeType }),
        purpose: "assistants",
      });
      fileIds.push(uploaded.id);
      console.log(`✅ Uploaded ${doc.type}: ${uploaded.id}`);
    } catch (error: any) {
      console.error(`⚠️ Failed to upload ${doc.type}:`, error.message);
    }
  }
  
  return fileIds;
}

// Trede definitions
const TREDE_INFO = {
  1: {
    name: "Trede 1",
    description: "Geïsoleerd (< 2 uur actief binnenshuis) of Deelname aan een activiteit buitenshuis (< 2 uur)",
  },
  2: {
    name: "Trede 2",
    description: "Deelname aan een activiteit buitenshuis (< 4 uur)",
  },
  3: {
    name: "Trede 3",
    description: "Activering of spoor 1 (< 10 uur)",
  },
  4: {
    name: "Trede 4",
    description: "Stage/WEP/Re-integratie spoor 1 (< 20 uur of < 50%)",
  },
  5: {
    name: "Trede 5",
    description: "Parttime betaald werk, detachering, voorziening of eigen werkgever",
  },
  6: {
    name: "Trede 6",
    description: "Weer volledig werkzaam binnen of buiten de organisatie",
  }
};

function buildInstructions(section6Text?: string | null, section14Text?: string | null): string {
  let intakeSectionsInfo = "";
  
  if (section6Text || section14Text) {
    intakeSectionsInfo = "\n\nBELANGRIJKE INTAKEFORMULIER SECTIES (gebruik deze informatie als primaire bron):\n";
    
    if (section6Text) {
      intakeSectionsInfo += `\nSECTIE 6 - Re-integratie en houding:\n${section6Text}\n`;
    }
    
    if (section14Text) {
      intakeSectionsInfo += `\nSECTIE 14 - Huidige situatie:\n${section14Text}\n`;
    }
    
    intakeSectionsInfo += "\nDeze secties bevatten de MEEST BETROUWBARE informatie over de huidige spoor en werkuren van de werknemer.\n";
  }
  
  return `Je bent een expert in het analyseren van Nederlandse re-integratiedocumenten voor de PoW-meter (Perspectief op Werk meter).

Je moet de PoW-meter trede bepalen op basis van de volgende prioriteitsvolgorde:

STAP 1: Gebruik de INTAKEFORMULIER SECTIES 6 en 14 (indien beschikbaar)${intakeSectionsInfo}

STAP 2: Als de secties 6 en 14 niet beschikbaar zijn, zoek dan in het INTAKEFORMULIER naar de huidige spoor/trede
- Gebruik file_search om het intakeformulier te vinden (zoek naar documenten met type "intake" of "intakeformulier")
- Zoek in het intakeformulier naar:
  * Huidige spoor (spoor 1, spoor 2, etc.)
  * Huidige trede (Trede 1-6)
  * PoW-meter niveau
  * Actuele situatie van de werknemer
- Als je een duidelijke spoor/trede vindt in het intakeformulier, gebruik die dan DIRECT
- 99% van de gevallen heeft een intakeformulier en de spoor staat meestal hierin

STAP 3: Als spoor/trede NIET duidelijk in intakeformulier staat, bepaal dan op basis van WERKUREN en contextuele informatie
- Zoek in ALLE documenten naar:
  * Aantal uren per week dat de werknemer werkt/kan werken
  * Contracturen
  * Belastbaarheid (uren per week)
  * Type werkzaamheden (betaald werk, stage, activering, etc.)
  * Huidige werkstatus
- Gebruik deze informatie om de trede te bepalen volgens de volgende richtlijnen:

TREDE BEPALING OP BASIS VAN WERKUREN EN CONTEXT:
- Trede 1: Geïsoleerd (< 2 uur actief binnenshuis) of Deelname aan activiteit buitenshuis (< 2 uur)
- Trede 2: Deelname aan activiteit buitenshuis (< 4 uur per week)
- Trede 3: Activering of spoor 1 (< 10 uur per week)
  * BELANGRIJK: Als de werknemer expliciet "spoor 1" doet met < 10 uur per week, dan is dit ALTIJD Trede 3
  * Trede 3 is voor de INITIËLE activeringsfase, niet voor stage/WEP
  * Als er sprake is van "eigen werk" of "eigen functie" in spoor 1 met < 10 uur, dan is dit Trede 3
- Trede 4: Stage/WEP/Re-integratie spoor 1 (< 20 uur per week of < 50% van contracturen)
  * BELANGRIJK: Trede 4 is SPECIFIEK voor Stage, WEP (Werkervaringsplek), of formele Re-integratie plaatsingen
  * Trede 4 is NIET voor gewone "spoor 1" activering met < 10 uur - dat is Trede 3
  * Als er expliciet "Stage", "WEP", "Werkervaringsplek" of "formele re-integratie plaatsing" staat, dan is dit Trede 4
  * Als het gewoon "spoor 1" is met < 10 uur zonder stage/WEP, dan is het Trede 3
- Trede 5: Parttime betaald werk, detachering, voorziening of eigen werkgever
- Trede 6: Weer volledig werkzaam binnen of buiten de organisatie

BELANGRIJKE REGEL VOOR SPOOR 1:
- Als sectie 6 of 14 expliciet "spoor 1" vermeldt met < 10 uur per week:
  * Als het gaat om Stage/WEP/Werkervaringsplek → Trede 4
  * Als het gaat om activering/eigen werk/eigen functie → Trede 3
  * Bij twijfel tussen Trede 3 en 4: kies Trede 3 als het < 10 uur is en geen expliciete Stage/WEP is

BELANGRIJK:
- Wees FLEXIBEL en CONTEXTUEEL - maak redelijke inschattingen op basis van beschikbare informatie
- Als je twijfelt tussen twee tredes, kies de meest passende op basis van de context
- Gebruik file_search om alle relevante documenten te doorzoeken
- Als informatie ontbreekt, maak dan een redelijke inschatting op basis van wat WEL beschikbaar is
- Wees NIET te strikt - als je redelijk zeker bent op basis van de documenten, geef dan een antwoord
- Geef de voorkeur aan informatie uit secties 6 en 14 van het intakeformulier, daarna andere delen van het intakeformulier, en gebruik andere documenten als aanvulling

UITVOERSTRUCTUUR VOOR DE PARAGRAAF:
De uiteindelijke tekst moet de vorm hebben: (1) Werknemer bevindt zich ten tijde van de intake in trede X van de PoW-meter. [Korte reden waarom, op basis van documenten.] (2) Het doel is door te groeien naar trede Y door [activiteiten om de volgende trede te bereiken.] (3) Optioneel: als de termijn onduidelijk is, een disclaimer over de termijn.
Schrijf alle teksten in de derde persoon, professioneel Nederlands, en baseer ze op de geüploade documenten.

Voor "reason_current_trede": één korte zin die uitlegt WAAROM de werknemer in deze trede zit (bijv. werkuren, type werk, medische afspraken).
Voorbeelden: "Zij verlaat de woning uitsluitend voor medische afspraken." of "Hij verricht momenteel 2x 3 uur werk in aangepaste vorm op locatie bij Middin."

Voor "activities_for_next_trede": één korte zin die beschrijft HOE de volgende trede bereikt kan worden (passende activiteiten uit de documenten of logisch afgeleid van de volgende trede).
Voorbeelden: "het realiseren van een passende activeringsplaats, waar haar belastbaarheid kan worden getoetst en opgebouwd." of "het opbouwen van stage-uren of een werkervaringsplek."

Zet "timeline_uncertain" op true als de documenten geen duidelijke termijn voor de volgende stap geven.

Geef je antwoord als JSON:
{
  "trede": number (1-6),
  "reasoning": "string met uitleg: (1) of je de spoor in secties 6/14 of het intakeformulier hebt gevonden, (2) welke werkuren en contextuele informatie je hebt gebruikt, (3) waarom je Trede 3 vs Trede 4 hebt gekozen (indien relevant), en (4) waarom je op deze trede uitkomt",
  "reason_current_trede": "string: één korte zin waarom de werknemer in deze trede zit (op basis van documenten)",
  "activities_for_next_trede": "string: één korte zin met activiteiten om de volgende trede te bereiken (alleen relevant als trede < 6)",
  "timeline_uncertain": "boolean, optioneel: true als er geen duidelijke termijn in de documenten staat"
}`;
}

type PowMeterAssistantResult = {
  trede: number;
  reasoning: string;
  reason_current_trede?: string;
  activities_for_next_trede?: string;
  timeline_uncertain?: boolean;
};

async function runAssistant(files: string[], section6Text?: string | null, section14Text?: string | null): Promise<PowMeterAssistantResult> {
  const assistant = await openai.beta.assistants.create({
    name: "PoW-meter Evaluator",
    instructions: buildInstructions(section6Text, section14Text),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Analyseer alle documenten en bepaal de PoW-meter trede. Gebruik de informatie uit secties 6 en 14 van het intakeformulier als primaire bron indien beschikbaar. Gebruik file_search om alle documenten te doorzoeken.",
        attachments: files.map((id) => ({ file_id: id, tools: [{ type: "file_search" }] })),
      },
    ],
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id
  });

  console.log('✅ Assistant run completed with status:', run.status);

  if (run.status !== 'completed') {
    throw new Error(`Assistant run failed: ${run.status}`);
  }

  const msgs = await openai.beta.threads.messages.list(thread.id);
  const text = msgs.data[0]?.content?.[0]?.type === 'text' ? msgs.data[0].content[0].text.value : '';
  
  // Extract JSON from response
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  let parsed: any = {};
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Fallback: try to extract trede number from text
    const tredeMatch = text.match(/trede\s*[1-6]|trede\s*[1-6]/i);
    if (tredeMatch) {
      const tredeNum = parseInt(tredeMatch[0].replace(/trede\s*/i, ''), 10);
      parsed = { trede: tredeNum, reasoning: text };
    } else {
      parsed = { trede: 1, reasoning: "Kon trede niet bepalen uit response" };
    }
  }

  // Normalize and return
  const reasonCurrent = typeof parsed.reason_current_trede === 'string' ? parsed.reason_current_trede.trim() : undefined;
  const activitiesNext = typeof parsed.activities_for_next_trede === 'string' ? parsed.activities_for_next_trede.trim() : undefined;
  const result: PowMeterAssistantResult = {
    trede: typeof parsed.trede === 'number' ? parsed.trede : parseInt(String(parsed.trede), 10) || 1,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : String(parsed.reasoning || ''),
    reason_current_trede: reasonCurrent || undefined,
    activities_for_next_trede: activitiesNext || undefined,
    timeline_uncertain: typeof parsed.timeline_uncertain === 'boolean' ? parsed.timeline_uncertain : undefined,
  };

  // Cleanup
  try {
    await openai.beta.assistants.delete(assistant.id);
    for (const fileId of files) {
      try {
        await openai.files.delete(fileId);
      } catch (e) {
        console.warn('Failed to delete file:', fileId);
      }
    }
  } catch (e) {
    console.warn('Failed to clean up assistant resources:', e);
  }

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    
    validateRequiredFields({ employeeId }, ['employeeId']);
    validateUUID(employeeId!, 'Employee ID');

    // Extract sections 6 and 14 from intake form BEFORE processing
    console.log('📋 Extracting sections 6 and 14 from intake form...');
    const section6Text = await extractIntakeSection(employeeId!, "6. Re-integratie en houding");
    const section14Text = await extractIntakeSection(employeeId!, "14. Huidige situatie");
    
    if (section6Text) {
      console.log('✅ Extracted Section 6 from intake form');
    }
    if (section14Text) {
      console.log('✅ Extracted Section 14 from intake form');
    }

    // Get documents by priority (same pattern as other routes)
    const docs = await listEmployeeDocumentsByPriority(employeeId!);
    
    if (docs.length === 0) {
      return createSuccessResponse(
        { pow_meter: "" },
        "Geen documenten gevonden"
      );
    }

    console.log(`📄 Found ${docs.length} documents for PoW-meter analysis:`, docs.map(d => d.type));

    // Upload ALL documents to OpenAI (same pattern as other routes)
    const fileIds = await uploadDocsToOpenAI(docs);
    
    if (fileIds.length === 0) {
      return createSuccessResponse(
        { pow_meter: "" },
        "Kon documenten niet uploaden naar OpenAI"
      );
    }

    console.log(`📤 Uploaded ${fileIds.length} files to OpenAI`);

    // Single assistant call that evaluates with extracted sections
    const { trede, reasoning, reason_current_trede, activities_for_next_trede, timeline_uncertain } = await runAssistant(fileIds, section6Text, section14Text);

    console.log(`✅ Determined Trede ${trede}: ${reasoning.slice(0, 100)}`);

    const tredeKey = trede as 1 | 2 | 3 | 4 | 5 | 6;
    const tredeInfo = TREDE_INFO[tredeKey];
    const nextTrede = trede < 6 ? trede + 1 : 6;
    const nextTredeInfo = TREDE_INFO[nextTrede as keyof typeof TREDE_INFO];

    let pow_meter: string;
    if (trede === 6) {
      pow_meter = `Werknemer bevindt zich ten tijde van de intake in trede 6 van de PoW-meter. Werknemer is volledig werkzaam binnen of buiten de organisatie.`;
    } else {
      const becauseText = reason_current_trede && reason_current_trede.length > 0
        ? reason_current_trede
        : `Hij/zij valt onder: ${tredeInfo.description}.`;
      if (!reason_current_trede || reason_current_trede.length === 0) {
        console.log('PoW-meter: using fallback for reason_current_trede');
      }
      const activitiesText = activities_for_next_trede && activities_for_next_trede.length > 0
        ? activities_for_next_trede
        : nextTredeInfo.description;
      if (!activities_for_next_trede || activities_for_next_trede.length === 0) {
        console.log('PoW-meter: using fallback for activities_for_next_trede');
      }
      const part1 = `Werknemer bevindt zich ten tijde van de intake in trede ${trede} van de PoW-meter. ${becauseText}`;
      const part2 = `Het doel is door te groeien naar trede ${nextTrede} van de PoW-meter door ${activitiesText}.`;
      const disclaimer = "Over de termijn waarin deze stap kan worden gezet kan op dit moment geen uitspraak worden gedaan; dit is afhankelijk van de ontwikkeling van de belastbaarheid.";
      const parts = timeline_uncertain ? [part1, part2, disclaimer] : [part1, part2];
      pow_meter = parts.join(" ");
    }

    // Persist to database
    const supabaseService = SupabaseService.getInstance();
    await supabaseService.upsertTPMeta(employeeId!, { pow_meter: stripCitations(pow_meter) });

    return createSuccessResponse(
      { pow_meter: stripCitations(pow_meter) },
      `PoW-meter successfully determined: ${tredeInfo.name}`
    );
  } catch (error: any) {
    return handleAPIError(error);
  }
}
