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
    // Download and upload to OpenAI
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) return null;
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = await openai.files.create({
      file: new File([buffer], `intake.pdf`, { type: 'application/pdf' }),
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
    const response = messages.data[0].content[0];
    
    let extractedText = '';
    if (response.type === 'text') {
      extractedText = response.text.value.trim();
    }
    
    // Cleanup
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    
    return extractedText && extractedText !== 'NIET_GEVONDEN' ? extractedText : null;
  } catch (error: any) {
    console.error(`❌ Error extracting ${sectionName}:`, error.message);
    return null;
  }
}

/** Parse occupational_doctor_org (e.g. "Arts L. Bollen, werkend onder supervisie van: arts T. de Haas") into names. */
function parseBedrijfsartsNames(occupational_doctor_org: string | null | undefined): { bedrijfsarts: string; supervisor: string } | null {
  const s = (occupational_doctor_org || '').trim();
  if (!s) return null;
  const match = s.match(/^(.+?)\s*,?\s*werkend onder supervisie van\s*:?\s*(.+)$/i);
  if (match) {
    return { bedrijfsarts: match[1].trim(), supervisor: match[2].trim() };
  }
  return { bedrijfsarts: s, supervisor: '' };
}

function nlDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildInstructions(
  medischeSituatieText?: string | null,
  functiebeschrijvingText?: string | null,
  bedrijfsartsNames?: { bedrijfsarts: string; supervisor: string } | null,
  fmlDateFormatted?: string | null
): string {
  const namesBlock = bedrijfsartsNames
    ? `
BEDRIJFSARTS EN SUPERVISOR (gebruik deze exacte namen in de eerste zin):
- Naam bedrijfsarts: ${bedrijfsartsNames.bedrijfsarts}
- Naam supervisor: ${bedrijfsartsNames.supervisor || '(niet van toepassing)'}
Vervang [naam bedrijfsarts] en [naam supervisor] in de eerste zin door bovenstaande namen. Schrijf geen placeholders.
`
    : `
BEDRIJFSARTS EN SUPERVISOR: Als deze niet hierboven gegeven zijn, zoek in de documenten naar de naam van de bedrijfsarts en de supervisor (vaak in FML, Medische situatie of prognose). Vul de echte namen in. Alleen als je ze echt nergens kunt vinden, gebruik dan de placeholders [naam bedrijfsarts] en [naam supervisor].
`;

  const dateHint = fmlDateFormatted
    ? `- Gebruik voor de FML-datum: ${fmlDateFormatted} (staat al correct geformatteerd).\n`
    : '';

  return `Je bent een NL re-integratie-rapportage assistent voor ValentineZ.
Lees ALLE aangeleverde documenten via file_search en schrijf UITSLUITEND de sectie "visie_loopbaanadviseur".

${medischeSituatieText ? `
BELANGRIJK: Gebruik DEZE informatie uit het intake formulier (sectie "Medische situatie") als primaire bron voor FML-beperkingen:
${medischeSituatieText}

Baseer de beperkingen ALLEEN op de FML-beperkingen zoals genoemd in bovenstaande intake informatie.
` : ''}

${functiebeschrijvingText ? `
BELANGRIJK: Gebruik DEZE informatie uit het intake formulier (sectie "7. Arbeidsdeskundige rapport") als basis voor de functiecontext:
${functiebeschrijvingText}

Houd rekening met de informatie uit bovenstaande intake sectie bij het beoordelen van de beperkingen en mogelijkheden.
` : ''}
${namesBlock}

BELANGRIJKE FORMATTING REGELS:
- Datum ALTIJD in format: "25 april 2025" (dag maand jaar, volledige maandnaam)
- NOOIT gebruik: "25/04/2025" of "25-04-2025" of andere formaten
${dateHint}- Eerste alinea (voor de lijst) MOET tussen **dubbele sterretjes** voor bold
- Gebruik bullet points met • (niet ☑ of andere symbolen)

Output structuur (EXACT volgen):
**Werknemer heeft conform de FML van [25 april 2025] opgesteld door bedrijfsarts [naam bedrijfsarts] werkend onder supervisie van bedrijfsarts [naam supervisor] beperkingen in de volgende rubrieken:**

• Persoonlijk functioneren
• Sociaal functioneren  
• Aanpassing aan fysieke omgevingseisen
• Dynamische handelingen
• Statische houdingen
• Werktijden

KRITIEKE REGELS:
- Eerste zin TUSSEN **sterretjes** voor bold markdown
- Datum als "25 april 2025" (GEEN andere formaten)
- Gebruik • voor bullet points (niet ☑)
- Alleen categorieën met daadwerkelijke beperkingen opnemen
- GEEN citations of bronvermeldingen

Output uitsluitend JSON: { "visie_loopbaanadviseur": string }`;
}

async function runAssistant(
  files: string[],
  medischeSituatieText?: string | null,
  functiebeschrijvingText?: string | null,
  bedrijfsartsNames?: { bedrijfsarts: string; supervisor: string } | null,
  fmlDateFormatted?: string | null
) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Visie Loopbaan Adviseur",
    instructions: buildInstructions(medischeSituatieText, functiebeschrijvingText, bedrijfsartsNames, fmlDateFormatted),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer de JSON voor visie_loopbaanadviseur.",
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
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { visie_loopbaanadviseur: text }; }

  // Cleanup
  await openai.beta.assistants.delete(assistant.id);
  for (const fileId of files) {
    await openai.files.delete(fileId);
  }
  console.log('✅ Cleaned up assistant and files');

  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    // Fetch tp_meta for bedrijfsarts/supervisor names and FML date (from Step 2)
    const { data: meta } = await supabase
      .from("tp_meta")
      .select("occupational_doctor_org, fml_izp_lab_date")
      .eq("employee_id", employeeId)
      .maybeSingle();
    const bedrijfsartsNames = parseBedrijfsartsNames(meta?.occupational_doctor_org ?? null);
    const fmlDateFormatted = meta?.fml_izp_lab_date ? nlDate(meta.fml_izp_lab_date) : null;
    if (bedrijfsartsNames) {
      console.log('✅ Using bedrijfsarts/supervisor from tp_meta:', bedrijfsartsNames.bedrijfsarts, bedrijfsartsNames.supervisor || '(geen supervisor)');
    }

    // Extract sections from intake form
    console.log('📋 Extracting sections from intake form...');
    const medischeSituatieText = await extractIntakeSection(employeeId, "5. Medische situatie");
    // Use section 7 for functiebeschrijving instead of section 3
    const functiebeschrijvingText = await extractIntakeSection(employeeId, "7. Arbeidsdeskundige rapport");
    
    if (medischeSituatieText) {
      console.log('✅ Extracted Medische situatie from intake form');
    }
    if (functiebeschrijvingText) {
      console.log('✅ Extracted Arbeidsdeskundige rapport from intake form');
    }

    const docPaths = await listEmployeeDocumentPaths(employeeId);
    if (docPaths.length === 0) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }
    const fileIds = await uploadDocsToOpenAI(docPaths);
    const parsed = await runAssistant(fileIds, medischeSituatieText, functiebeschrijvingText, bedrijfsartsNames, fmlDateFormatted);
    const visie_loopbaanadviseur = stripCitations((parsed?.visie_loopbaanadviseur || '').trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, visie_loopbaanadviseur } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { visie_loopbaanadviseur },
      autofilled_fields: ["visie_loopbaanadviseur"],
    });
  } catch (err: any) {
    console.error("❌ visie-adviseur route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
