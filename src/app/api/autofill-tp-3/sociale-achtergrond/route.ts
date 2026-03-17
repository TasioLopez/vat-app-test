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
BELANGRIJK: Onderstaande tekst komt uit het intake formulier (sectie "Sociaal en maatschappelijke context"). Gebruik ALLEEN deze informatie. Voeg GEEN informatie toe die niet in deze tekst staat.

INTAKE SECTIE TEKST:
${extractedIntakeSection}
`
    : '';

  return `Je bent een NL re-integratie-rapportage assistent voor ValentineZ.
${intakeBlock}
Schrijf UITSLUITEND de sectie "sociale_achtergrond" op basis van de bovenstaande intake-informatie${extractedIntakeSection ? ' (gebruik ALLEEN wat in de intake staat)' : ''}.

Vereisten:
- 1–3 alinea's, scheid alinea's met dubbele newlines (\n\n)
- Neem alleen op wat expliciet in documenten staat: woon-/thuissituatie en ondersteuning, sociale context/activiteiten, relevante praktische zaken (taal/rijbewijs/vervoer/uren) indien expliciet genoemd
- Zakelijk en AVG-proof schrijven
- SCHRIJFSTIJL: Gebruik "Werknemer" (zonder "De"). NOOIT "De werknemer" schrijven, altijd "Werknemer" aan het begin van zinnen.

BELANGRIJK - Vermijd negatie-gerichte zinnen:
- Focus op wat WEL aanwezig is, niet op wat ONTBREEKT
- Vermijd onnodige zinnen met "geen", "niet", "ontbreekt" tenzij dit echt relevant is voor de context
- Schrijf positief: "Werknemer woont met zijn kinderen" in plaats van "Er zijn geen uitwonende kinderen"
- Schrijf positief: "Werknemer regelt alles zelf" in plaats van "Werknemer ontvangt geen ondersteuning"
- Schrijf positief: "Werknemer spreekt soms af met vrienden" in plaats van "Werknemer heeft geen regelmatige sociale activiteiten"
- Alleen negatie gebruiken als het essentieel is voor begrip (bijv. "Werknemer heeft geen rijbewijs" als dit relevant is voor vervoer)

STRIKT VERBODEN (privacy regels):
- NOOIT exacte leeftijden van kinderen of familieleden noemen (bijv. "21 jaar", "15 jaar")
- GEBRUIK ALTIJD algemene termen zoals: "meerderjarige zoon/dochter", "minderjarige kinderen", "volwassen kinderen", "tiener"
- NOOIT medische aandoeningen, beperkingen, of diagnoses van familieleden noemen
- GEEN specifieke gezondheidsinformatie over anderen dan de werknemer zelf

Toegestane informatie:
✓ Woonsituatie: waar woont werknemer, met wie (algemeen: "partner", "kinderen", "alleen")
✓ Familie nabijheid: "vader woont in de buurt", "zus woont dichtbij" (GEEN exacte afstanden zoals "5 huizen verderop")
✓ Ondersteuning: wie helpt, hoe vaak contact
✓ Dagelijkse structuur: huishoudelijke taken, sociale activiteiten
✓ Hobby's en vrije tijd
✓ Energie en belastbaarheid (algemeen, geen medische details)

Voorbeeld FOUT: "zoon van 21 jaar met een lichte verstandelijke beperking"
Voorbeeld GOED: "meerderjarige zoon"

Voorbeeld FOUT: "dochter van 15 jaar"
Voorbeeld GOED: "minderjarige dochter" of "tiener dochter"

- GEEN citations of bronvermeldingen
Output uitsluitend JSON: { "sociale_achtergrond": string }`;
}

async function runAssistant(files: string[], extractedIntakeSection?: string | null) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Sociale Achtergrond",
    instructions: buildInstructions(extractedIntakeSection),
    model: "gpt-4o-mini",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer de JSON voor sociale_achtergrond.",
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
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { sociale_achtergrond: text }; }

  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const extractedSection = await extractIntakeSection(employeeId, "Sociaal en maatschappelijke context");
    if (!extractedSection) {
      return NextResponse.json(
        { error: "Intake sectie 'Sociaal en maatschappelijke context' niet gevonden of leeg.", details: {} },
        { status: 200 }
      );
    }

    const docPaths = await listEmployeeDocumentPaths(employeeId);
    if (docPaths.length === 0) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }
    const fileIds = await uploadDocsToOpenAI(docPaths);
    const parsed = await runAssistant(fileIds, extractedSection);
    const sociale_achtergrond = stripCitations((parsed?.sociale_achtergrond || '').trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, sociale_achtergrond } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { sociale_achtergrond },
      autofilled_fields: ["sociale_achtergrond"],
    });
  } catch (err: any) {
    console.error("❌ sociale-achtergrond route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}


