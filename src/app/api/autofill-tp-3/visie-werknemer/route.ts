import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
// Avoid importing beta types to keep build compatible

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

async function readPdfFromStorage(path: string): Promise<string> {
  const { data: file } = await supabase.storage.from("documents").download(path);
  if (!file) return "";
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const bufferString = buf.toString('utf8');
    const readableText = bufferString.match(/[A-Za-z0-9\s\-\.,:;()]{10,}/g);
    if (readableText && readableText.length > 0) return readableText.join(' ');
    return "";
  } catch {
    return "";
  }
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
Lees ALLE aangeleverde documenten via file_search en schrijf UITSLUITEND de sectie "visie_werknemer".
Vereisten:
- 1–2 alinea's, scheid alinea's met dubbele newlines (\n\n)
- Benoem houding/motivatie/wensen, wat lukt/niet lukt gezien huidige belastbaarheid (in eigen woorden), bereidheid t.o.v. 2e spoor (onderzoeken, scholing/omscholing, trajectdoel)
- Geen medische details of diagnoses. Zakelijk en AVG-proof
- GEEN citations of bronvermeldingen
Output uitsluitend JSON: { "visie_werknemer": string }`;
}

async function runAssistant(files: string[]) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Visie Werknemer",
    instructions: buildInstructions(),
    model: "gpt-4o-mini",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer de JSON voor visie_werknemer.",
        attachments: files.map((id) => ({ file_id: id, tools: [{ type: "file_search" }] })),
      },
    ],
  });

  let run: any = await openai.beta.threads.runs.create(thread.id, { assistant_id: assistant.id });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    if (run.status === 'completed') break;
    if (['failed','cancelled','expired','incomplete'].includes(run.status)) throw new Error(`Assistant run failed: ${run.status}`);
  }

  const msgs = await openai.beta.threads.messages.list(thread.id);
  const text = msgs.data[0]?.content?.[0]?.type === 'text' ? msgs.data[0].content[0].text.value : '';
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  let parsed: any = {};
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { visie_werknemer: text }; }

  // Optional cleanup intentionally skipped to avoid SDK type incompatibilities during build
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
    const visie_werknemer = stripCitations((parsed?.visie_werknemer || '').trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, visie_werknemer } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { visie_werknemer },
      autofilled_fields: ["visie_werknemer"],
    });
  } catch (err: any) {
    console.error("❌ visie-werknemer route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}


