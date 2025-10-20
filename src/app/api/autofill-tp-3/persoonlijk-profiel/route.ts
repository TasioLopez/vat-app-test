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
Lees ALLE aangeleverde documenten via file_search en schrijf UITSLUITEND de sectie "persoonlijk_profiel".

Vereisten voor de output:
- Schrijf in verhaalvorm, één doorlopende alinea
- Gebruik de schrijfstijl van de voorbeelden
- Houd de data aan van de aangeleverde input

Inhoud die MOET worden opgenomen:
1. Demografie: leeftijd, geslacht, vanaf wanneer in dienst, organisatie, functietitel
2. Loopbaan: verschillende taken/rollen (GEEN beschrijving van functie-inhoud)
3. Opleiding: hoogst afgeronde opleiding (bijv. "mbo-4 Agogisch Werk")
4. Mobiliteit: rijbewijs, eigen auto, openbaar vervoer gebruik
5. Talen: Nederlandse en Engelse taalbeheersing
6. Computervaardigheden: MS Office, Word, Excel

BELANGRIJKE REGELS:
- NOOIT subjectieve of waarderende bewoordingen (zoals "met toewijding", "is enthousiast", "werkt graag met mensen")
- Alleen functietitel, organisatie en startdatum vermelden - GEEN functie-inhoud beschrijving
- Werkverleden opsommen (eventueel hoe lang uitgevoerd indien beschikbaar)
- Als rijbewijs/auto niet van toepassing: vermeld hoe werknemer zich verplaatst
- Computervaardigheden in aparte zin

VOORBEELD STIJL:
"Werknemer is een 51-jarige vrouw die sinds 1995 werkzaam is bij Cordaan als woonbegeleider (VGZ). Zij heeft gedurende haar loopbaan verschillende taken vervuld binnen de organisatie, waaronder begeleiding van cliënten en werkzaamheden op het gebied van planning en administratie. Haar hoogst afgeronde opleiding is mbo-4 Agogisch Werk. Zij beschikt over rijbewijs B en heeft een eigen auto, verder maakt zij gebruik van het openbaar vervoer. Werknemer beheerst de Nederlandse taal goed in woord en geschrift en heeft een redelijke beheersing van de Engelse taal, zowel mondeling als schriftelijk. Zij beschikt over goede computervaardigheden en is bekend met het MS Office-pakket, waaronder het werken met Word en Excel."

GEEN citations of bronvermeldingen.
Output uitsluitend JSON: { "persoonlijk_profiel": string }`;
}

async function runAssistant(files: string[]) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Persoonlijk Profiel",
    instructions: buildInstructions(),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer de JSON voor persoonlijk_profiel.",
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
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { persoonlijk_profiel: text }; }

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
    const persoonlijk_profiel = stripCitations((parsed?.persoonlijk_profiel || '').trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, persoonlijk_profiel } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { persoonlijk_profiel },
      autofilled_fields: ["persoonlijk_profiel"],
    });
  } catch (err: any) {
    console.error("❌ persoonlijk-profiel route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
