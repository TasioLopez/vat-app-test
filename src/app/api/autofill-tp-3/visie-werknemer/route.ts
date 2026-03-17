import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getOpenAIFileParams } from "@/lib/openai-file-upload";
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
    const { filename, mimeType } = getOpenAIFileParams(p);
    const uploaded = await openai.files.create({
      file: new File([buf], filename, { type: mimeType }),
      purpose: "assistants",
    });
    fileIds.push(uploaded.id);
  }
  return fileIds;
}

// Extract specific section from intake form using AI
async function extractIntakeSection(employeeId: string, sectionName: string): Promise<string | null> {
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
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) return null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { filename, mimeType } = getOpenAIFileParams(path);
    const uploadedFile = await openai.files.create({
      file: new File([buffer], filename, { type: mimeType }),
      purpose: "assistants"
    });

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
    const response = messages.data[0].content[0];

    let extractedText = '';
    if (response.type === 'text') {
      extractedText = response.text.value.trim();
    }

    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);

    return extractedText && extractedText !== 'NIET_GEVONDEN' ? extractedText : null;
  } catch (error: any) {
    console.error(`❌ Error extracting ${sectionName}:`, error.message);
    return null;
  }
}

function buildInstructions(extractedIntakeSection?: string | null): string {
  const intakeBlock = extractedIntakeSection
    ? `
BELANGRIJK: Onderstaande tekst komt uit het intake formulier (sectie "Visie van werknemer"). Gebruik ALLEEN deze informatie. Voeg GEEN informatie toe die niet in deze tekst staat (bijv. geen 'open voor scholing' als dat niet genoemd wordt).

INTAKE SECTIE TEKST:
${extractedIntakeSection}
`
    : '';

  return `Je bent een NL re-integratie-rapportage assistent voor ValentineZ.
${intakeBlock}
Schrijf UITSLUITEND de sectie "visie_werknemer" op basis van de bovenstaande intake-informatie${extractedIntakeSection ? ' (gebruik ALLEEN wat in de intake staat)' : ''}.
Vereisten:
- 1–2 alinea's, scheid alinea's met dubbele newlines (\n\n)
- Benoem houding/motivatie/wensen, wat lukt/niet lukt gezien huidige belastbaarheid (in eigen woorden), bereidheid t.o.v. 2e spoor alleen indien in de intake genoemd
- Geen medische details of diagnoses. Zakelijk en AVG-proof
- SCHRIJFSTIJL: Gebruik "Werknemer" (zonder "De"). NOOIT "De werknemer" schrijven, altijd "Werknemer" aan het begin van zinnen.
- GEEN citations of bronvermeldingen
Output uitsluitend JSON: { "visie_werknemer": string }`;
}

async function runAssistant(files: string[], extractedIntakeSection?: string | null) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Visie Werknemer",
    instructions: buildInstructions(extractedIntakeSection),
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
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  let parsed: any = {};
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { visie_werknemer: text }; }

  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const extractedSection = await extractIntakeSection(employeeId, "Visie van werknemer");
    if (!extractedSection) {
      return NextResponse.json(
        { error: "Intake sectie 'Visie van werknemer' niet gevonden of leeg.", details: {} },
        { status: 200 }
      );
    }

    const docPaths = await listEmployeeDocumentPaths(employeeId);
    if (docPaths.length === 0) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }
    const fileIds = await uploadDocsToOpenAI(docPaths);
    const parsed = await runAssistant(fileIds, extractedSection);
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


