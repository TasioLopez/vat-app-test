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
    .select("url, type")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });
  if (!docs?.length) return [];
  
  // Filter for AD rapport, FML, IZP only - use the actual stored type names
  const allowedTypes = ['ad_rapportage', 'fml_izp'];
  const paths: string[] = [];
  for (const d of docs) {
    const docType = (d.type as string)?.toLowerCase();
    if (allowedTypes.includes(docType)) {
      const path = extractStoragePath(d.url as string);
      if (path) paths.push(path);
    }
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
Lees ALLE aangeleverde documenten via file_search en schrijf UITSLUITEND de sectie "advies_ad_passende_arbeid".

Vereisten voor de output:
- Extracteer AD rapport auteur naam en datum
- Extracteer hoofdadvies uit AD rapport over 2e spoor, passende arbeid strategie
- Extracteer definitie van passende arbeid met referentie naar persoonsprofiel en FML
- Extracteer of genereer voorbeelden van passende arbeid als bullet points

STRUCTUUR - Exacte format:

**In het arbeidsdeskundigrapport opgesteld door [naam] op [datum] staat het volgende advies over passende arbeid:**

*[Hoofdadvies paragraaf in cursief - bijv. "Omdat het eerste ziektejaar bijna verstreken is... geen re-integratiekansen te missen."]*

Passend werk sluit aan bij de bekwaamheden (zie persoonsprofiel) en belastbaarheid (zie FML) van werkneemster. Enkele voorbeelden van passend werk:

• [Voorbeeld 1]
• [Voorbeeld 2]
• [Voorbeeld 3]

FORMATTERING:
- **Bold**: Intro regel met auteur naam en datum
- *Cursief*: Hoofdadvies paragraaf
- Regular: Definitie paragraaf
- Bullet lijst: Voorbeelden (gebruik • voor markdown)

BELANGRIJKE REGELS:
- Extracteer AD rapport auteur naam en datum
- Extracteer hoofdadvies over 2e spoor re-integratietraject
- Extracteer definitie van passende arbeid
- Extracteer of genereer realistische voorbeelden van passende arbeid
- Gebruik markdown formatting: **bold**, *cursief*, • bullet
- Geen subjectieve bewoordingen, alleen feitelijke informatie uit documenten

VOORBEELD STIJL:
**In het arbeidsdeskundigrapport opgesteld door M. Arendsen op 30 mei 2025 staat het volgende advies over passende arbeid:**

*Omdat het eerste ziektejaar bijna verstreken is en er geen sprake is van volledige werkhervatting in eigen of ander werk, adviseer ik om een 2e spoor re-integratietraject in te zetten. In een 2e spoor re-integratietraject wordt werkneemster, naast eventuele re-integratie binnen de eigen werkgever, ondersteund bij het oriënteren op en zoeken naar passend werk bij andere werkgevers. Dit om geen re-integratiekansen te missen.*

Passend werk sluit aan bij de bekwaamheden (zie persoonsprofiel) en belastbaarheid (zie FML) van werkneemster. Enkele voorbeelden van passend werk:

• (ondersteunende) administratieve werkzaamheden
• Roosteraar/planner (let op deadlines en productiepieken)

GEEN citations of bronvermeldingen.
Output uitsluitend JSON: { "advies_ad_passende_arbeid": string }`;
}

async function runAssistant(files: string[]) {
  const assistant = await openai.beta.assistants.create({
    name: "TP AD Advies Passende Arbeid",
    instructions: buildInstructions(),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer de JSON voor advies_ad_passende_arbeid.",
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
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { advies_ad_passende_arbeid: text }; }

  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const docPaths = await listEmployeeDocumentPaths(employeeId);
    if (docPaths.length === 0) {
      return NextResponse.json({ error: "Geen AD rapport, FML of IZP documenten gevonden" }, { status: 200 });
    }
    const fileIds = await uploadDocsToOpenAI(docPaths);
    const parsed = await runAssistant(fileIds);
    const advies_ad_passende_arbeid = stripCitations((parsed?.advies_ad_passende_arbeid || '').trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, advies_ad_passende_arbeid } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { advies_ad_passende_arbeid },
      autofilled_fields: ["advies_ad_passende_arbeid"],
    });
  } catch (err: any) {
    console.error("❌ ad-advies-passende-arbeid route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
