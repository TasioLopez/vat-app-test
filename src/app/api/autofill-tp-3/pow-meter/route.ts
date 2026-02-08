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

function buildInstructions(): string {
  return `Je bent een expert in het analyseren van Nederlandse re-integratiedocumenten voor de PoW-meter (Perspectief op Werk meter).

Je moet de PoW-meter trede bepalen op basis van de volgende prioriteitsvolgorde:

STAP 1: Zoek eerst in het INTAKEFORMULIER naar de huidige spoor/trede
- Gebruik file_search om het intakeformulier te vinden (zoek naar documenten met type "intake" of "intakeformulier")
- Zoek in het intakeformulier naar:
  * Huidige spoor (spoor 1, spoor 2, etc.)
  * Huidige trede (Trede 1-6)
  * PoW-meter niveau
  * Actuele situatie van de werknemer
- Als je een duidelijke spoor/trede vindt in het intakeformulier, gebruik die dan DIRECT
- 99% van de gevallen heeft een intakeformulier en de spoor staat meestal hierin

STAP 2: Als spoor/trede NIET duidelijk in intakeformulier staat, bepaal dan op basis van WERKUREN en contextuele informatie
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
- Trede 4: Stage/WEP/Re-integratie spoor 1 (< 20 uur per week of < 50% van contracturen)
- Trede 5: Parttime betaald werk, detachering, voorziening of eigen werkgever
- Trede 6: Weer volledig werkzaam binnen of buiten de organisatie

BELANGRIJK:
- Wees FLEXIBEL en CONTEXTUEEL - maak redelijke inschattingen op basis van beschikbare informatie
- Als je twijfelt tussen twee tredes, kies de meest passende op basis van de context
- Gebruik file_search om alle relevante documenten te doorzoeken
- Als informatie ontbreekt, maak dan een redelijke inschatting op basis van wat WEL beschikbaar is
- Wees NIET te strikt - als je redelijk zeker bent op basis van de documenten, geef dan een antwoord
- Geef de voorkeur aan informatie uit het intakeformulier, maar gebruik andere documenten als aanvulling

Geef je antwoord als JSON:
{
  "trede": number (1-6),
  "reasoning": "string met uitleg: (1) of je de spoor in het intakeformulier hebt gevonden, (2) welke werkuren en contextuele informatie je hebt gebruikt, en (3) waarom je op deze trede uitkomt"
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
      expectationText = `De verwachting is dat werknemer binnen nu en 3 maanden de stap naar ${nextTredeInfo.name} (${nextTredeInfo.description}) zal maken.`;
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
