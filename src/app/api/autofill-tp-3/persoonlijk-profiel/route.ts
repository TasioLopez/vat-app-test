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
  // Format computer skills level
  const computerSkillsMap: { [key: number]: string } = {
    1: "geen",
    2: "basis",
    3: "goede",
    4: "uitstekende"
  };
  const computerSkillsLevel = computerSkillsMap[employeeData.computer_skills] || "onbekende";
  
  // Format Dutch language skills
  const dutchSpeaking = employeeData.dutch_speaking || "onbekend";
  const dutchWriting = employeeData.dutch_writing || "onbekend";
  const dutchReading = employeeData.dutch_reading || "onbekend";
  
  // Format transport
  const transportTypes = employeeData.transport_type || [];
  const hasDriversLicense = employeeData.drivers_license;
  const driversLicenseType = employeeData.drivers_license_type;
  // Format license types as string (handle both array and legacy string format)
  const licenseTypeStr = Array.isArray(driversLicenseType) 
    ? driversLicenseType.join(', ') 
    : (typeof driversLicenseType === 'string' ? driversLicenseType : 'onbekend');
  
  return `Je bent een NL re-integratie-rapportage assistent voor ValentineZ.
Schrijf UITSLUITEND de sectie "persoonlijk_profiel" op basis van de VERPLICHTE BASISGEGEVENS hieronder en aanvullende info uit documenten.

VERPLICHTE BASISGEGEVENS (ALTIJD GEBRUIKEN - dit zijn de officiële gegevens):
- Geslacht: ${employeeData.gender || 'onbekend'}
- Geboortedatum: ${employeeData.date_of_birth || 'onbekend'}
- Huidige functie: ${employeeData.current_job || 'onbekend'}
- Werkervaring: ${employeeData.work_experience || 'onbekend'}
- Opleidingsniveau: ${employeeData.education_level || 'onbekend'}
- Opleidingsnaam: ${employeeData.education_name || 'onbekend'}
- Rijbewijs: ${hasDriversLicense ? `Ja, type ${licenseTypeStr}` : 'Nee'}
- Eigen vervoer: ${transportTypes.length > 0 ? transportTypes.join(', ') : 'Geen eigen vervoer'}
- Spreekvaardigheid NL: ${dutchSpeaking}
- Schrijfvaardigheid NL: ${dutchWriting}
- Leesvaardigheid NL: ${dutchReading}
- Heeft eigen PC: ${employeeData.has_computer ? 'Ja' : 'Nee'}
- PC-vaardigheden niveau: ${computerSkillsLevel} (${employeeData.computer_skills}/4)
- Contracturen: ${employeeData.contract_hours || 'onbekend'} uur per week

Vereisten voor de output:
- Schrijf in verhaalvorm, één doorlopende alinea
- GEBRUIK DE BOVENSTAANDE BASISGEGEVENS - dit zijn de officiële, correcte gegevens
- Aanvullende context (zoals werkgever naam, dienstjaren) mag uit documenten komen

Inhoud die MOET worden opgenomen:
1. Demografie: leeftijd (bereken uit geboortedatum), geslacht, vanaf wanneer in dienst, organisatie, functietitel
2. Loopbaan: werkervaring (GEEN beschrijving van functie-inhoud)
3. Opleiding: ${employeeData.education_level || ''} ${employeeData.education_name || ''}
4. Mobiliteit: ${hasDriversLicense ? `rijbewijs ${licenseTypeStr}` : 'geen rijbewijs'}, vervoer: ${transportTypes.join(', ') || 'geen eigen vervoer'}
5. Talen: Spreken ${dutchSpeaking}, Schrijven ${dutchWriting}, Lezen ${dutchReading}
6. Computervaardigheden: ${employeeData.has_computer ? 'Heeft PC' : 'Geen eigen PC'}, niveau: ${computerSkillsLevel}

BELANGRIJKE REGELS:
- NOOIT subjectieve of waarderende bewoordingen (zoals "met toewijding", "is enthousiast", "werkt graag met mensen")
- Alleen functietitel, organisatie en startdatum vermelden - GEEN functie-inhoud beschrijving
- Werkverleden opsommen (eventueel hoe lang uitgevoerd indien beschikbaar)
- PC-vaardigheden correct weergeven: ${computerSkillsLevel === 'geen' ? 'beschikt NIET over computervaardigheden' : `beschikt over ${computerSkillsLevel} computervaardigheden`}
- Taalvaardigheid correct: spreekt NL ${dutchSpeaking}, schrijft ${dutchWriting}, leest ${dutchReading}

VOORBEELD STIJL:
"Werknemer is een 51-jarige vrouw die sinds 1995 werkzaam is bij Cordaan als woonbegeleider (VGZ). Zij heeft gedurende haar loopbaan verschillende taken vervuld binnen de organisatie, waaronder begeleiding van cliënten en werkzaamheden op het gebied van planning en administratie. Haar hoogst afgeronde opleiding is mbo-4 Agogisch Werk. Zij beschikt over rijbewijs B en heeft een eigen auto, verder maakt zij gebruik van het openbaar vervoer. Werknemer beheerst de Nederlandse taal goed in woord en geschrift en heeft een redelijke beheersing van de Engelse taal, zowel mondeling als schriftelijk. Zij beschikt over goede computervaardigheden en is bekend met het MS Office-pakket, waaronder het werken met Word en Excel."

GEEN citations of bronvermeldingen.
Output uitsluitend JSON: { "persoonlijk_profiel": string }`;
}

async function runAssistant(files: string[], employeeData: any) {
  const assistant = await openai.beta.assistants.create({
    name: "TP Persoonlijk Profiel",
    instructions: buildInstructions(employeeData),
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

    // Fetch employee basic info
    const { data: employee } = await supabase
      .from("employees")
      .select("first_name, last_name, client_id")
      .eq("id", employeeId)
      .single();

    // Fetch employee details (AUTHORITATIVE DATA)
    const { data: details } = await supabase
      .from("employee_details")
      .select("*")
      .eq("employee_id", employeeId)
      .single();

    // Fetch client info for company name
    let clientName = "";
    if (employee?.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", employee.client_id)
        .single();
      clientName = client?.name || "";
    }

    // Combine data
    const employeeData = {
      ...details,
      first_name: employee?.first_name,
      last_name: employee?.last_name,
      client_name: clientName,
    };

    console.log("📋 Using employee details for persoonlijk profiel:", {
      computer_skills: employeeData.computer_skills,
      has_computer: employeeData.has_computer,
      dutch_speaking: employeeData.dutch_speaking,
      dutch_writing: employeeData.dutch_writing,
      dutch_reading: employeeData.dutch_reading,
      transport_type: employeeData.transport_type,
      drivers_license: employeeData.drivers_license,
    });

    const docPaths = await listEmployeeDocumentPaths(employeeId);
    if (docPaths.length === 0) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }
    const fileIds = await uploadDocsToOpenAI(docPaths);
    const parsed = await runAssistant(fileIds, employeeData);
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
