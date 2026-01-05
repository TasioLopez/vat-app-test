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

function buildInstructions(employeeData: any): string {
  // Format education level - use exact value from database
  const educationLevel = employeeData.education_level || null;
  const educationName = employeeData.education_name || '';
  
  // Build education phrase based on what's available
  let educationPhrase = '';
  let educationForStructure = '';
  if (educationLevel && educationName) {
    educationPhrase = `${educationLevel} ${educationName}`;
    educationForStructure = `${educationLevel} niveau`;
  } else if (educationLevel) {
    educationPhrase = educationLevel;
    educationForStructure = `${educationLevel} niveau`;
  } else if (educationName) {
    educationPhrase = educationName;
    educationForStructure = 'functies passend bij haar opleiding en ervaring';
  } else {
    educationPhrase = 'niet gespecificeerd';
    educationForStructure = 'functies passend bij haar opleiding en ervaring';
  }
  
  // Format job titles - use exact values from database
  const currentJob = employeeData.current_job || '';
  const workExperience = employeeData.work_experience || '';
  
  // Combine job titles for display
  let jobTitles = currentJob;
  if (workExperience && workExperience !== currentJob) {
    // Work experience may contain multiple titles separated by comma
    jobTitles = currentJob ? `${currentJob}, ${workExperience}` : workExperience;
  }
  
  // Determine if education level is known for instruction
  const hasEducationLevel = !!educationLevel;
  
  return `Je bent een NL re-integratie-rapportage assistent voor ValentineZ.
Lees ALLE aangeleverde documenten via file_search en schrijf UITSLUITEND de sectie "zoekprofiel".

VERPLICHTE BASISGEGEVENS (GEBRUIK DEZE EXACTE WAARDEN):
- Opleidingsniveau: ${educationPhrase}
- Huidige/vorige functie(s): ${jobTitles || 'onbekend'}
- Geslacht: ${employeeData.gender || 'onbekend'}

Vereisten voor de output:
- Schrijf in verhaalvorm, twee aparte alinea's
- Gebruik dubbele newlines tussen de alinea's
- Gebruik de schrijfstijl van de voorbeelden
- GEBRUIK DE EXACTE FUNCTIETITELS ZOALS HIERBOVEN VERMELD
- DATUMS ALTIJD IN FORMAAT: "23 oktober 2025" (dag maand jaar, maand voluit in het Nederlands)

STRUCTUUR - Twee alinea's:

ALINEA 1: Kwalificaties & Ervaring
${hasEducationLevel 
  ? `- Geschikt voor ${educationLevel} niveau functies op basis van kennis en ervaring` 
  : `- Geschikt voor functies passend bij haar opleiding en ervaring`}
- Kan voornamelijk steunen op ervaring als ${jobTitles || '[functietitels uit profiel]'}
- Zoektocht houdt rekening met wensen, profiel en beperkingen/voorwaarden zoals beschreven in de FML van [datum uit documenten in formaat "23 oktober 2025"]

ALINEA 2: Gewenste Werkomstandigheden (haal uit FML/documenten)
- Focus op zittende functies met beperkte fysieke belasting
- Mogelijkheid tot afwisseling van houding
- Rustig werktempo zonder tijdsdruk
- Meest geschikt binnen een stabiel team, in een ondersteunende werkomgeving met weinig emotionele prikkels
- Kan steunen op leidinggevende of collega indien nodig
- Werk moet goed bereikbaar zijn met openbaar vervoer of uitvoerbaar vanuit huis
- Werkuren kunnen geleidelijk worden uitgebreid naarmate het herstel vordert
- Bouwt capaciteit stap voor stap op en blijft duurzaam inzetbaar

BELANGRIJKE REGELS:
${hasEducationLevel 
  ? `- GEBRUIK ALTIJD DE EXACTE OPLEIDINGSNIVEAU: "${educationLevel}" (niet afkorten of wijzigen)` 
  : `- Opleidingsniveau is niet bekend, zeg NIET "onbekend niveau" maar gebruik: "functies passend bij haar opleiding en ervaring"`}
- GEBRUIK ALTIJD DE EXACTE FUNCTIETITELS: "${jobTitles}" (niet parafraseren)
- DATUMS ALTIJD VOLLEDIG UITGESCHREVEN: "23 oktober 2025" (NOOIT "23-10-2025")
- Gebruik verhaalvorm, geen opsommingen of bullet points
- Focus op voorwaarden/beperkingen uit documenten
- Vermeld FML referentie met datum (haal uit documenten)
- Twee duidelijke alinea's met dubbele newlines ertussen

VOORBEELD STIJL:
${hasEducationLevel 
  ? `"Werknemer is geschikt voor ${educationLevel} niveau functies op basis van kennis en ervaring.` 
  : `"Werknemer is geschikt voor functies passend bij haar opleiding en ervaring.`} Zij kan voornamelijk steunen op haar ervaring als ${jobTitles || 'woonbegeleider en planner/roostermaker'}. De zoektocht naar werk houdt rekening met de wensen van de werknemer, het persoonlijk profiel en de beperkingen/voorwaarden zoals beschreven in de FML van 25 april 2025.

De focus ligt op zittende functies met beperkte fysieke belasting en de mogelijkheid tot afwisseling van houding. Een rustig werktempo zonder tijdsdruk is gewenst. Het meest geschikt is een functie binnen een stabiel team, in een ondersteunende werkomgeving met weinig emotionele prikkels, waar de werknemer kan steunen op een leidinggevende of collega indien nodig. Het werk moet goed bereikbaar zijn met openbaar vervoer of uitvoerbaar vanuit huis. Haar werkuren kunnen geleidelijk worden uitgebreid naarmate het herstel vordert, waardoor zij haar capaciteit stap voor stap kan opbouwen en duurzaam inzetbaar blijft."

GEEN citations of bronvermeldingen.
Output uitsluitend JSON: { "zoekprofiel": string }`;
}

async function runAssistant(files: string[], employeeData: any) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Zoekprofiel",
    instructions: buildInstructions(employeeData),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer de JSON voor zoekprofiel.",
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
  try { parsed = JSON.parse(jsonStr); } catch { parsed = { zoekprofiel: text }; }

  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    // Fetch employee details (AUTHORITATIVE DATA for education level and job titles)
    const { data: details } = await supabase
      .from("employee_details")
      .select("education_level, education_name, current_job, work_experience, gender")
      .eq("employee_id", employeeId)
      .single();

    const employeeData: any = details || {};

    console.log("📋 Using employee details for zoekprofiel:", {
      education_level: employeeData.education_level,
      education_name: employeeData.education_name,
      current_job: employeeData.current_job,
      work_experience: employeeData.work_experience,
    });

    const docPaths = await listEmployeeDocumentPaths(employeeId);
    if (docPaths.length === 0) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }
    const fileIds = await uploadDocsToOpenAI(docPaths);
    const parsed = await runAssistant(fileIds, employeeData);
    const zoekprofiel = stripCitations((parsed?.zoekprofiel || '').trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, zoekprofiel } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { zoekprofiel },
      autofilled_fields: ["zoekprofiel"],
    });
  } catch (err: any) {
    console.error("❌ zoekprofiel route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
