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

  // Document priority: AD rapport > FML/IZP > Intake > Others
  const priorityOrder: { [key: string]: number } = {
    'ad_rapportage': 1,
    'ad_rapport': 1,
    'arbeidsdeskundig': 1,
    'fml': 2,
    'izp': 2,
    'lab': 2,
    'functiemogelijkhedenlijst': 2,
    'inzetbaarheidsprofiel': 2,
    'lijst arbeidsmogelijkheden': 2,
    'intakeformulier': 3,
    'intake': 3,
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

function buildInstructions(): string {
  return `Je bent een expert in het analyseren van Nederlandse re-integratiedocumenten voor de PoW-meter (Perspectief op Werk meter).

Je moet de PoW-meter beslissingsboom STRICT sequentieel doorlopen. Gebruik file_search om ALLE documenten te doorzoeken voor elke vraag.

BESLISSINGSBOOM (volgorde is cruciaal):

VRAAG 1: Zijn er benutbare mogelijkheden (zie advies/ conclusie BA)?
- Zoek in documenten naar: advies bedrijfsarts, conclusie BA, benutbare mogelijkheden
- Als NEE → STOP, antwoord: Trede 1
- Als JA → ga naar Vraag 2

VRAAG 2: Komt men regelmatig het huis uit (2x per week)?
- Zoek naar: activiteiten buitenshuis, contact buitenshuis, bezoeken, uitgaan
- Uitzondering: functionele contacten zoals huisarts/fysiotherapeut tellen NIET mee
- Als NEE → STOP, antwoord: Trede 1
- Als JA → ga naar Vraag 3

VRAAG 3: Heeft men minimaal 2x per week activiteiten/ sociale contacten buitenshuis?
- Zoek naar: sociale activiteiten, koffieochtend, cursus, taallessen, wekelijks contact
- Als NEE → STOP, antwoord: Trede 2
- Als JA → ga naar Vraag 4

VRAAG 4: Is men gemotiveerd om aan het werk te gaan?
- Zoek naar: motivatie, bereidheid, open staan, willen vs kunnen, demotivatie factoren
- Als NEE → STOP, antwoord: Trede 3
- Als JA → ga naar Vraag 5

VRAAG 5: Kan men op het moment van de intake minimaal 12 uur per week werken?
- Zoek naar: uren per week, belastbaarheid, werkdruk, verantwoordelijkheid, zelfstandigheid
- Als NEE → STOP, antwoord: Trede 3
- Als JA → ga naar Vraag 6

VRAAG 6: Kan men zonder opleiding direct aan het werk?
- Zoek naar: onbetaald werk, zelfstandig taken, verantwoordelijkheid, economische waarde, beroepsopleiding
- Als NEE → STOP, antwoord: Trede 4
- Als JA → ga naar Vraag 7

VRAAG 7: Kan een functie zonder aanpassingen/voorzieningen uitgevoerd worden?
- Zoek naar: 65% hersteld, loonwaarde, aanpassingen, voorzieningen, werkplek, taakaanpassing
- Als NEE → STOP, antwoord: Trede 5
- Als JA → antwoord: Trede 6

BELANGRIJK:
- Doorzoek ALLE documenten met file_search voor elke vraag
- Stop bij de eerste NEE antwoord
- Maak redelijke inferenties op basis van beschikbare informatie
- Als informatie ontbreekt voor een vraag, geef dan een redelijke inschatting op basis van wat wel beschikbaar is
- Wees niet te strikt - als je redelijk zeker bent op basis van de documenten, geef dan een antwoord

Geef je antwoord als JSON:
{
  "trede": number (1-6),
  "reasoning": "string met uitleg welke vragen je hebt geëvalueerd en waarom je op deze trede uitkomt"
}`;
}

async function runAssistant(files: string[]): Promise<{ trede: number; reasoning: string }> {
  const assistant = await openai.beta.assistants.create({
    name: "PoW-meter Evaluator",
    instructions: buildInstructions(),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Analyseer alle documenten en bepaal de PoW-meter trede door de beslissingsboom sequentieel door te lopen. Gebruik file_search om alle documenten te doorzoeken.",
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
      const tredeNum = parseInt(tredeMatch[0].replace(/trede\s*/i, ''));
      parsed = { trede: tredeNum, reasoning: text };
    } else {
      parsed = { trede: 1, reasoning: "Kon trede niet bepalen uit response" };
    }
  }

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

  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    
    validateRequiredFields({ employeeId }, ['employeeId']);
    validateUUID(employeeId!, 'Employee ID');

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

    // Single assistant call that evaluates the entire decision tree
    const { trede, reasoning } = await runAssistant(fileIds);

    console.log(`✅ Determined Trede ${trede}: ${reasoning.slice(0, 100)}`);

    const tredeKey = trede as 1 | 2 | 3 | 4 | 5 | 6;
    const tredeInfo = TREDE_INFO[tredeKey];
    const nextTrede = trede < 6 ? trede + 1 : 6;
    const nextTredeInfo = TREDE_INFO[nextTrede as keyof typeof TREDE_INFO];
    
    let expectationText = "";
    if (trede === 6) {
      expectationText = "Werknemer is volledig werkzaam binnen of buiten de organisatie.";
    } else {
      expectationText = `De verwachting is dat werknemer binnen nu en [X] maanden de stap naar ${nextTredeInfo.name} (${nextTredeInfo.description}) zal maken.`;
    }

    const pow_meter = `Werknemer bevindt zich op het moment van de intake in ${tredeInfo.name} (${tredeInfo.description}) van de PoW-meter. ${expectationText}`;

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
