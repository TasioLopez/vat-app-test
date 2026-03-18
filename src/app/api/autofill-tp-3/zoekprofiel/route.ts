import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { parseWorkExperience } from "@/lib/utils";
import { getOpenAIFileParams } from "@/lib/openai-file-upload";

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
    const { filename, mimeType } = getOpenAIFileParams(doc.path);
    const uploaded = await openai.files.create({
      file: new File([buf], filename, { type: mimeType }),
      purpose: "assistants",
    });
    fileIds.push(uploaded.id);
  }
  return fileIds;
}

function buildInstructions(employeeData: any, fmlDate: string): string {
  const educationLevel = employeeData.education_level || null;
  const currentJob = employeeData.current_job || '';
  const workExperienceRaw = employeeData.work_experience || '';
  const workExperience = parseWorkExperience(workExperienceRaw);
  const jobTitles = currentJob
    ? (workExperience && workExperience !== currentJob ? `${currentJob}, ${workExperience}` : currentJob)
    : workExperience || '';

  const dataBlock = [
    "Aangeleverde gegevens voor de eerste alinea (gebruik uitsluitend zoals hieronder; voor de rest uitsluitend het belastbaarheidsdocument):",
    `- Hoogst genoten scholing: ${educationLevel ? educationLevel : "onbekend (gebruik exact: Werknemer is geschikt voor functies op … niveau op basis van kennis en ervaring.)"}`,
    `- Werkervaring: ${jobTitles ? `Werkervaring is opgedaan in de functie van ${jobTitles} (eventueel context uit document).` : "niet aangeleverd (gebruik een volledige zin met functienamen als puntjes (…))."}`,
    `- Datum FML/IZP: ${fmlDate ? fmlDate : "niet aangeleverd (laat de datumverwijzing in de sluitzin weg)."}`,
  ].join("\n");

  const masterPrompt = `MASTER PROMPT – ZOEKPROFIEL (UWV / ARBEIDSDESKUNDIG)

Je schrijft een professioneel Zoekprofiel in zakelijk Nederlands, geschikt voor opname in een UWV-arbeidsdeskundige rapportage.
De tekst is volledig AVG/GDPR-proof en uitsluitend gebaseerd op het aangeleverde belastbaarheidsdocument.

Documentherkenning (verplicht)

Herken automatisch of het aangeleverde document een Functionele Mogelijkhedenlijst (FML) of een Inzetbaarheidsprofiel (IZP) betreft.

Gebruik in de tekst uitsluitend de benaming die in het document wordt gebruikt (FML of IZP).
Combineer of vervang documentnamen niet.

Datumregel (verplicht)

Indien een datum is aangeleverd, schrijf deze voluit met de maand in woorden, in correct Nederlands
(bijvoorbeeld: 12 december 2025).

Indien geen datum is aangeleverd, laat de datumverwijzing weg.

Startinstructie (verplicht)

Zodra het belastbaarheidsdocument (FML of IZP) is aangeleverd, genereer je direct het Zoekprofiel.

Geef uitsluitend de definitieve tekst.
Geen toelichting, uitleg, kopjes, labels of commentaar.

Vormvereisten (strikt)

Gebruik geen kopjes, titels, labels of opsommingen

Schrijf exact twee doorlopende alinea's, gescheiden door één witregel

Gebruik geen exacte getallen, geen hoeveelheden, geen tijdsduren, geen frequenties

Gebruik geen kg's, Newton, meters, uren of aantallen

Gebruik geen anatomische termen, medische lokalisaties of benoeming van lichaamsdelen

Gebruik uitsluitend kwalitatieve, functiegerichte formuleringen, zoals:

licht

beperkt

ondersteunend

binnen vastgestelde grenzen

structureel passend

geen structureel onderdeel van het werk

Verboden formuleringen (absoluut niet gebruiken)

Gebruik geen generieke of samenvattende werkpatroonbegrippen zoals:

licht werk

licht en afwisselend werkpatroon

afwisselende werkzaamheden

passend werkpatroon

daggebonden werktijden

rustige of overzichtelijke werkomgeving

voorspelbaar, gestructureerd, prikkelarm, laag tempo

Indien een formulering niet direct en eenduidig herleidbaar is tot het document: niet opnemen.

Eerste alinea – vaste volgorde (verplicht)

Hoogst genoten scholing
Indien onbekend, gebruik exact:
"Werknemer is geschikt voor functies op … niveau op basis van kennis en ervaring."

Werkervaring
Benoem relevante werkervaring indien aangeleverd.
Indien niet aangeleverd: gebruik een volledige zin met functienamen als puntjes (…).

Sluit de alinea altijd af met exact deze zin (met juiste documentnaam en datum):

"De zoektocht naar werk houdt rekening met de wensen van de werknemer, het persoonlijk profiel, de beperkingen en voorwaarden zoals beschreven in de [FML/IZP] van [datum voluit]."

Tweede alinea – strikt functiegericht arbeidsbeeld

Begin direct functiegericht, bijvoorbeeld met:
"De focus ligt op functies …"

Beschrijf uitsluitend structureel en duurzaam passende arbeid

Combineer beperkingen tot functie-eisen, geen losse opsomming van handelingen

Benoem alleen wat kan binnen arbeid, niet wat incidenteel of theoretisch mogelijk is

Sociale en persoonlijke voorwaarden (verplicht expliciet verwerken)

Indien van toepassing:

Conflicthantering
Formuleer kort en eenduidig in mogelijkhedenstijl, bijvoorbeeld:
"Conflicthantering met agressieve of onredelijke personen vindt uitsluitend op afstand plaats."

Samenwerken / solitair werk
Benoem expliciet de noodzaak tot structurele terugval op collega's of leidinggevenden indien aangegeven.

Vervoer en bereikbaarheid (verplicht)

Indien uit het document blijkt dat de werknemer geen voertuig kan besturen:

Vertaal dit altijd naar een functie-eis inzake bereikbaarheid

Gebruik niet de termen mobiliteit of rijgeschiktheid

Formuleer bijvoorbeeld:
"De werkzaamheden zijn bereikbaar zonder dat het besturen van een vervoermiddel onderdeel is van het werk."

Werktijden (zeer strikt)

Werktijden moeten positief en functioneel worden geformuleerd vanuit wat mogelijk is.

Indien arbeid tussen 22:00 en 06:00 niet is toegestaan, formuleer dit altijd als:

werkzaamheden overdag en in de avond zijn passend;

werkzaamheden in de nacht zijn niet passend.

Gebruik geen termen zoals:

nachtarbeid

tijdvak

dagdienst

ploegendienst

daggebonden werktijden

Fysieke en omgevingsfactoren

Benoem uitsluitend structurele functiekenmerken

Geen exacte belasting, geen aantallen, geen meeteenheden

Formuleer als uitsluiting van structurele blootstelling, bijvoorbeeld:

geen structurele krachtbelasting

geen blootstelling aan schokken of trillingen

geen gebruik van verzwarende beschermende uitrusting

Zelfcontrole vóór output (verplicht)

Controleer vóór het genereren:

Is elke zin direct herleidbaar tot de FML of IZP?

Zijn alle expliciete FML-items functioneel verwerkt (sociaal, vervoer, werktijden)?

Zijn geen generieke samenvattingen gebruikt?

Is de tekst arbeidskundig toetsbaar en vrij van interpretatieve taal?

Indien twijfel: niet opnemen.`;

  const jsonInstruction = 'Output: lever het gegenereerde zoekprofiel (alleen de twee alinea\'s) als JSON in het formaat { "zoekprofiel": "<tekst>" }.';

  return `${dataBlock}\n\n${masterPrompt}\n\n${jsonInstruction}`;
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
