import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** Ensures prognose_bedrijfsarts has intro + quoted block with opening/closing " and normalized labels. */
function normalizePrognoseBedrijfsarts(text: string): string {
  if (!text) return text;
  let s = text.trim();
  // Ensure opening quote after "het volgende aan:"
  const introEnd = "het volgende aan:";
  const idx = s.indexOf(introEnd);
  if (idx !== -1) {
    const afterIntro = s.slice(idx + introEnd.length);
    const trimmedAfter = afterIntro.replace(/^\s+/, "");
    if (trimmedAfter.length > 0 && trimmedAfter[0] !== '"') {
      s = s.slice(0, idx + introEnd.length) + "\n\"" + trimmedAfter;
    }
  }
  // Ensure closing quote at end
  if (s.length > 0 && s[s.length - 1] !== '"') {
    s = s + '"';
  }
  // Normalize label: Re-integratie advies -> Reintegratieadvies (bold)
  s = s.replace(/\*\*Re-integratie advies:\*\*/g, "**Reintegratieadvies:**");
  s = s.replace(/(?<!\*)(Re-integratie advies:)(?!\*)/g, "**Reintegratieadvies:**");
  return s;
}

function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith("documents/")) return url.slice("documents/".length);
  if (url && !url.includes("://") && !url.includes("object/")) return url;
  return null;
}

async function listEmployeeDocumentPaths(employeeId: string): Promise<string[]> {
  const { data: docs } = await supabase
    .from("documents")
    .select("url")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });
  if (!docs?.length) return [];
  const paths: string[] = [];
  for (const d of docs) {
    const path = extractStoragePath(d.url as string);
    if (path) paths.push(path);
  }
  return paths;
}

async function uploadDocsToOpenAI(paths: string[]) {
  const fileIds: string[] = [];
  for (const p of paths) {
    const { data: file } = await supabase.storage.from("documents").download(p);
    if (!file) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const uploaded = await openai.files.create({
      file: new File([buf], p.split('/').pop() || 'doc.pdf', { type: 'application/pdf' }),
      purpose: "assistants",
    });
    fileIds.push(uploaded.id);
  }
  return fileIds;
}

function buildInstructions(): string {
  return `Je bent een NL re-integratie-rapportage assistent voor ValentineZ.
Lees ALLE aangeleverde documenten via file_search en schrijf UITSLUITEND de sectie "prognose_bedrijfsarts".

BELANGRIJKE FORMATTING REGELS:
- Datum ALTIJD in format: "23 oktober 2025" (dag maand jaar, volledige maandnaam in het Nederlands)
- NOOIT gebruik: "23/10/2025" of "23-10-2025" of andere numerieke formaten
- Gebruik "bedrijfsarts" (niet "arts")

KRITIEK - EXACTE CITATEN:
- De tekst onder **Reintegratieadvies:** en **Prognose:** moet EXACT en LETTERLIJK worden overgenomen uit het brondocument
- KOPIEER de woorden PRECIES zoals ze in het document staan, inclusief eventuele typefouten of ongebruikelijke formuleringen
- NIET parafraseren of herformuleren - het moet een CITAAT zijn
- Als iets onduidelijk is, kopieer het toch letterlijk

OUTPUT STRUCTUUR (strikt volgen):
- Eerste regel: alleen de intro, ZONDER aanhalingstekens. Eindig met "in de terugkoppeling het volgende aan:"
- Daarna een nieuwe regel met ALLEEN een openingsaanhalingsteken "
- Gebruik exact de labels **Reintegratieadvies:** en **Prognose:** (één woord, geen "Re-integratie advies"). Alleen **vet** (**...**), geen cursief (*) voor deze labels
- De inhoud onder de labels is gewone tekst (geen asterisken voor cursief)
- Sluit af met een sluitingsaanhalingsteken " aan het einde van de hele block

Voorbeeld (vul [datum], [naam], [supervisor] en de citaten in):

Op [23 oktober 2025] geeft bedrijfsarts [naam] werkend onder supervisie van bedrijfsarts [supervisor] in de terugkoppeling het volgende aan:

"
**Reintegratieadvies:**
[EXACT citaat uit document - letterlijk overnemen]

**Prognose:**
[EXACT citaat uit document - letterlijk overnemen]"

REGELS:
- Gebruik alleen **...** voor vet. Gebruik geen *...* of vet+cursief voor de labels Reintegratieadvies en Prognose
- De labels zijn precies **Reintegratieadvies:** en **Prognose:** (vet alleen). De inhoud eronder is gewone tekst
- Het hele block van openingsaanhalingsteken tot sluitingsaanhalingsteken is één doorlopend geciteerd block; de intro staat buiten de aanhalingstekens

Zoek specifiek naar:
- Re-integratie advies secties in het document
- Prognose secties in het document
- Kopieer deze LETTERLIJK

GEEN citations of bronvermeldingen.
Output uitsluitend JSON: { "prognose_bedrijfsarts": string }`;
}

async function runAssistant(files: string[]) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Prognose Bedrijfsarts",
    instructions: buildInstructions(),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer de JSON voor prognose_bedrijfsarts.",
        attachments: files.map((id) => ({ file_id: id, tools: [{ type: "file_search" }] })),
      },
    ],
  });

  // Use createAndPoll like the working inleiding route
  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id
  });

  console.log('✅ Assistant run completed with status:', run.status);

  if (run.status !== 'completed') {
    throw new Error(`Assistant run failed: ${run.status}`);
  }

  const msgs = await openai.beta.threads.messages.list(thread.id);
  const text = msgs.data[0]?.content?.[0]?.type === 'text' ? msgs.data[0].content[0].text.value : '';

  // Try to extract JSON object
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  let parsed: any = {};
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { prognose_bedrijfsarts: text }; }

  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const docPaths = await listEmployeeDocumentPaths(employeeId);
    if (docPaths.length === 0) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }
    const fileIds = await uploadDocsToOpenAI(docPaths);
    const parsed = await runAssistant(fileIds);
    const prognose_bedrijfsarts = normalizePrognoseBedrijfsarts(
      stripCitations((parsed?.prognose_bedrijfsarts || '').trim())
    );

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, prognose_bedrijfsarts } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { prognose_bedrijfsarts },
      autofilled_fields: ["prognose_bedrijfsarts"],
    });
  } catch (err: any) {
    console.error("❌ prognose-bedrijfsarts route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
