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
Lees ALLE aangeleverde documenten via file_search en schrijf UITSLUITEND de sectie "visie_plaatsbaarheid".

BELANGRIJK - EXTERNE vs INTERNE FUNCTIES:
- FOCUS OP EXTERNE functiemogelijkheden (banen bij andere werkgevers, algemene arbeidsmarkt)
- NEGEER of vermijd INTERNE functiemogelijkheden (banen binnen hetzelfde bedrijf, interne doorgroeimogelijkheden)
- In AD/FML documenten: zoek naar secties met "externe", "extern", "arbeidsmarkt", "andere werkgevers"
- Vermijd secties over "interne", "binnen het bedrijf", "doorgroei binnen organisatie", "interne mobiliteit"

Vereisten voor de output:
- GENEREER geschikte EXTERNE functie suggesties op basis van werknemer profiel en beperkingen
- Gebruik werknemer's opleiding, ervaring, vaardigheden
- Houd rekening met FML beperkingen (fysiek, cognitief, emotioneel)
- Houd rekening met werkcondities uit documenten
- Baseer suggesties op EXTERNE arbeidsmarktmogelijkheden, niet op interne functies

STRUCTUUR - Exacte format:

Naast de functies die de arbeidsdeskundige mogelijk als passend beschouwt denkt de loopbaan adviseur ook aan:

☑ [Functietitel 1]: [Specifieke voorwaarde/reden waarom geschikt]
☑ [Functietitel 2]: [Specifieke voorwaarde/reden waarom geschikt]
☑ [Functietitel 3]: [Specifieke voorwaarde/reden waarom geschikt]
☑ [Functietitel 4]: [Specifieke voorwaarde/reden waarom geschikt]
☑ En soortgelijk.

FORMATTERING:
- Gebruik ☑ voor checkmarks
- Elke regel: functietitel gevolgd door dubbele punt en voorwaarde
- Verhalende stijl voor voorwaarden, geen keywords
- Laatste item altijd: "En soortgelijk."

BELANGRIJKE REGELS:
- GENEREER 4-5 realistische EXTERNE functie suggesties (algemene arbeidsmarkt, niet bedrijfsspecifiek)
- Baseer op werknemer's profiel (opleiding, ervaring, vaardigheden)
- Houd rekening met FML beperkingen (fysiek, cognitief, emotioneel)
- Houd rekening met werkcondities uit documenten
- Gebruik verhalende stijl voor voorwaarden
- Geen disclaimer in output (wordt door UI toegevoegd)
- VOORKEUR: Gebruik informatie uit "externe functiemogelijkheden" secties in AD/FML documenten
- VERMIJD: Functies die alleen binnen het huidige bedrijf mogelijk zijn

VOORBEELD STIJL:
Naast de functies die de arbeidsdeskundige mogelijk als passend beschouwt denkt de loopbaan adviseur ook aan:

☑ Receptie-/telefonie medewerker (rustige setting): Alleen passend als het gaat om een rustige balie zonder hectische bezoekersstromen of emotionele belasting.
☑ Archief-/documentbeheerder (digitaal): Passend omdat dit geconcentreerd en rustig werk is dat grotendeels zittend uitgevoerd kan worden.
☑ Backoffice medewerker zorgverzekeraar/gemeente: Passend omdat het gaat om ondersteunende, administratieve taken zonder hoge productiepieken.
☑ Medewerker kwaliteitsregistratie/data-entry: Geschikt doordat dit repeterend, overzichtelijk werk is dat zonder tijdsdruk en fysiek zwaar werk uitgevoerd kan worden.
☑ En soortgelijk.

GEEN citations of bronvermeldingen.
GEEN disclaimer paragraaf (wordt door UI toegevoegd).
Output uitsluitend JSON: { "visie_plaatsbaarheid": string }`;
}

async function runAssistant(files: string[]) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Visie Plaatsbaarheid",
    instructions: buildInstructions(),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer de JSON voor visie_plaatsbaarheid.",
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
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { visie_plaatsbaarheid: text }; }

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
    const visie_plaatsbaarheid = stripCitations((parsed?.visie_plaatsbaarheid || '').trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, visie_plaatsbaarheid } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { visie_plaatsbaarheid },
      autofilled_fields: ["visie_plaatsbaarheid"],
    });
  } catch (err: any) {
    console.error("❌ visie-plaatsbaarheid route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
