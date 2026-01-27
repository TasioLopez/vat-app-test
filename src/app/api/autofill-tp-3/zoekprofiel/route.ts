import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { parseWorkExperience } from "@/lib/utils";

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

function nlDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

async function listEmployeeDocumentsByPriority(employeeId: string): Promise<Array<{ type: string; url: string; path: string }>> {
  const { data: docs } = await supabase
    .from("documents")
    .select("type, url")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });
  
  if (!docs?.length) return [];

  // Document priority: FML/IZP > AD rapport > intake > others
  const priorityOrder: { [key: string]: number } = {
    'fml_izp': 1,
    'ad_rapportage': 2,
    'ad_rapport': 2,
    'intakeformulier': 3,
  };

  // Sort by priority, then by uploaded_at (newest first within same priority)
  const sortedDocs = docs
    .map(doc => ({
      ...doc,
      priority: priorityOrder[(doc.type || '').toLowerCase()] || 99,
    }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return 0; // Keep original order (newest first from query)
    });

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
  const fileIds: string[] = [];
  for (const doc of docs) {
    const { data: file } = await supabase.storage.from("documents").download(doc.path);
    if (!file) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const uploaded = await openai.files.create({
      file: new File([buf], doc.path.split('/').pop() || 'doc.pdf', { type: 'application/pdf' }),
      purpose: "assistants",
    });
    fileIds.push(uploaded.id);
  }
  return fileIds;
}

function buildInstructions(employeeData: any, fmlDate: string): string {
  const educationLevel = employeeData.education_level || null;
  const educationName = employeeData.education_name || '';
  
  // Format job titles - use exact values from database
  const currentJob = employeeData.current_job || '';
  const workExperienceRaw = employeeData.work_experience || '';
  
  // Parse work_experience to handle JSON arrays
  const workExperience = parseWorkExperience(workExperienceRaw);
  
  // Combine job titles for display
  let jobTitles = currentJob;
  if (workExperience && workExperience !== currentJob) {
    jobTitles = currentJob ? `${currentJob}, ${workExperience}` : workExperience;
  }

  // Build education phrase for first paragraph
  let educationPhrase = '';
  if (educationLevel) {
    educationPhrase = `${educationLevel} niveau`;
  } else {
    educationPhrase = '... niveau (...)';
  }

  // Build work experience phrase
  let workExperiencePhrase = '';
  if (jobTitles) {
    workExperiencePhrase = `Zij kan voornamelijk steunen op haar ervaring als ${jobTitles}.`;
  } else {
    workExperiencePhrase = `Zij kan voornamelijk steunen op haar ervaring als ...`;
  }

  // Build date phrase
  let datePhrase = '';
  if (fmlDate) {
    datePhrase = fmlDate;
  }

  return `Schrijf een professioneel Zoekprofiel in zakelijk Nederlands, geschikt voor gebruik binnen een UWV-arbeidsdeskundige rapportage. De tekst moet volledig AVG/GDPR-proof zijn en uitsluitend gebaseerd zijn op het aangeleverde belastbaarheidsdocument.

## Documentherkenning (verplicht):

Herken automatisch of het aangeleverde document een Functionele Mogelijkhedenlijst (FML) of een Inzetbaarheidsprofiel (IZP) betreft.

Gebruik in de tekst uitsluitend de benaming die in het aangeleverde document wordt gebruikt (FML of IZP).

Voeg geen andere documenttypen toe en combineer de benamingen niet.

## Datumregel (verplicht):

Indien een datum wordt genoemd, schrijf deze altijd voluit met de maand in woorden in het Nederlands (bijvoorbeeld: 7 oktober 2025, niet 7-10-2025 of 07-10-2025).

Indien geen datum is aangeleverd, laat de datum leeg.

## Startinstructie (verplicht):

Zodra het belastbaarheidsdocument (FML of IZP) wordt aangeleverd, genereer je direct het Zoekprofiel. Geef uitsluitend de definitieve tekst en geen toelichting, uitleg of kopjes.

## Vormvereisten (strikt):

Gebruik geen kopjes, titels, labels of opsommingen.

Schrijf in twee doorlopende alinea's, gescheiden door één witregel.

Gebruik geen exacte getallen, geen hoeveelheden, geen tijdsduren, geen frequenties, geen kg's, geen Newton (N).

Gebruik geen benoeming van lichaamsdelen, medische lokalisaties of anatomische termen.

Gebruik uitsluitend kwalitatieve, functiegerichte formuleringen zoals: licht, beperkt, afwisselend, ondersteunend, binnen vastgestelde grenzen, incidenteel onderdeel van het werk.

## Eerste alinea – vaste volgorde (verplicht):

Hoogst genoten scholing: ${educationLevel 
    ? `Werknemer is geschikt voor ${educationLevel} niveau functies op basis van kennis en ervaring.` 
    : `Werknemer is geschikt voor functies op ... niveau (...) op basis van kennis en ervaring.`}

Werkervaring: ${workExperiencePhrase}

Sluit deze alinea altijd af met exact de volgende zin, met gebruik van de juiste documentnaam (FML of IZP) en correcte datumweergave:
${datePhrase 
    ? `"De zoektocht naar werk houdt rekening met de wensen van de werknemer, het persoonlijk profiel en de beperkingen/voorwaarden zoals beschreven in de [FML/IZP] van ${datePhrase}."`
    : `"De zoektocht naar werk houdt rekening met de wensen van de werknemer, het persoonlijk profiel en de beperkingen/voorwaarden zoals beschreven in de [FML/IZP]."`}

## Tweede alinea – gecombineerd en strikt functiegericht arbeidsbeeld:

Begin direct functiegericht, bijvoorbeeld met "De focus ligt op functies ...".

Beschrijf de inzetbaarheid uitsluitend in termen van functiekenmerken.

Handelingen die volgens het aangeleverde document slechts in beperkte mate zijn toegestaan worden niet afzonderlijk benoemd, maar gecombineerd verwerkt als onderdeel van een licht en afwisselend werkpatroon.

Benoem uitsluitend wat structureel en duurzaam passend is binnen arbeid.

## Strikte documentafbakening (verplicht):

Voeg geen contextuele, organisatorische, cognitieve of omgevingskenmerken toe die niet expliciet of functioneel uit het aangeleverde document volgen.

Vermijd termen zoals (niet-limitatief): overzichtelijk, stabiel, rustig, voorspelbaar, gestructureerd, weinig prikkels, laag tempo, eenvoudige werkomgeving.

Indien een kenmerk niet direct herleidbaar is tot het aangeleverde document, mag het niet worden benoemd.

Bij twijfel: niet opnemen.

## Zelfcontrole vóór output (verplicht):

Controleer of elke zin functioneel herleidbaar is tot het aangeleverde document (FML of IZP).

Verwijder automatisch gegenereerde contextzinnen die niet strikt noodzakelijk zijn voor de arbeidskundige beoordeling.

BELANGRIJK: Gebruik ALLEEN informatie die expliciet of functioneel uit de aangeleverde documenten volgt. Voeg GEEN kenmerken toe die niet in de documenten staan.

Output uitsluitend JSON: { "zoekprofiel": string }`;
}

async function runAssistant(files: string[], employeeData: any, fmlDate: string) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Zoekprofiel",
    instructions: buildInstructions(employeeData, fmlDate),
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Genereer het Zoekprofiel op basis van de aangeleverde documenten.",
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

  // Try to extract JSON object
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  let parsed: any = {};
  try { 
    parsed = JSON.parse(jsonStr); 
  } catch { 
    parsed = { zoekprofiel: text }; 
  }

  // Clean up assistant and files
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
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    // Fetch employee details (AUTHORITATIVE DATA for education level and job titles)
    const { data: details } = await supabase
      .from("employee_details")
      .select("education_level, education_name, current_job, work_experience, gender")
      .eq("employee_id", employeeId)
      .single();

    const employeeData: any = details || {};

    // Fetch FML date from tp_meta
    const { data: meta } = await supabase
      .from("tp_meta")
      .select("fml_izp_lab_date")
      .eq("employee_id", employeeId)
      .single();

    const fmlDate = nlDate(meta?.fml_izp_lab_date);

    console.log("📋 Using employee details for zoekprofiel:", {
      education_level: employeeData.education_level,
      education_name: employeeData.education_name,
      current_job: employeeData.current_job,
      work_experience: employeeData.work_experience,
      fml_date: fmlDate,
    });

    // Get documents by priority: FML/IZP > AD rapport > intake > others
    const docs = await listEmployeeDocumentsByPriority(employeeId);
    if (docs.length === 0) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }

    console.log("📄 Documents by priority:", docs.map(d => d.type));

    const fileIds = await uploadDocsToOpenAI(docs);
    if (fileIds.length === 0) {
      return NextResponse.json({ error: "Kon documenten niet uploaden" }, { status: 500 });
    }

    const parsed = await runAssistant(fileIds, employeeData, fmlDate);
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
