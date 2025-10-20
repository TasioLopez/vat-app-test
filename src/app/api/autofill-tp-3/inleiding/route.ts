import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { NB_DEFAULT_GEEN_AD } from "@/lib/tp/static";

// ---- INIT ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---- Helper Functions ----
function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith("documents/")) return url.slice("documents/".length);
  if (url && !url.includes("://") && !url.includes("object/")) return url;
  return null;
}

function nlDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

// Gender-based pronoun helpers
function getGenderPronoun(type: 'possessive' | 'subject' | 'informal', gender?: string): string {
  const isMale = gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'man' || gender?.toLowerCase() === 'm';
  switch(type) {
    case 'possessive': return isMale ? 'zijn' : 'haar';
    case 'subject': return isMale ? 'Hij' : 'Zij';
    case 'informal': return isMale ? 'Hij' : 'Ze';
    default: return isMale ? 'zijn' : 'haar';
  }
}

function getTitlePrefix(gender?: string): string {
  const isMale = gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'man' || gender?.toLowerCase() === 'm';
  return isMale ? 'meneer' : 'mevrouw';
}

function getTitleAbbrev(gender?: string): string {
  const isMale = gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'man' || gender?.toLowerCase() === 'm';
  return isMale ? 'dhr.' : 'mevr.';
}

function getInitials(firstName?: string): string {
  if (!firstName) return '';
  return firstName.split(' ').map(n => n[0]?.toUpperCase()).filter(Boolean).join('. ') + '.';
}

// ---- Build Detailed Assistant Instructions ----
function buildInleidingInstructions(context: any): string {
  const { employee, details, meta, client } = context;
  
  const gender = details?.gender;
  const pronPoss = getGenderPronoun('possessive', gender);
  const pronSubj = getGenderPronoun('subject', gender);
  const pronInf = getGenderPronoun('informal', gender);
  const title = getTitlePrefix(gender);
  const titleAbbrev = getTitleAbbrev(gender);
  
  const empInitials = getInitials(employee?.first_name);
  const empLastName = employee?.last_name || '';
  const currentJob = (details?.current_job || '').toLowerCase();
  
  const hasFML = !!meta?.fml_izp_lab_date;
  const fmlDate = nlDate(meta?.fml_izp_lab_date);
  const hasAD = !!meta?.has_ad_report;
  const adDate = nlDate(meta?.ad_report_date);
  const firstSickDay = nlDate(meta?.first_sick_day);
  
  const refInitials = getInitials(client?.referent_first_name);
  const refLastName = client?.referent_last_name || '';
  const refTitle = getTitlePrefix(client?.referent_gender);
  const companyName = client?.name || '';
  
  return `
Je bent een Nederlandse re-integratie rapportage specialist voor ValentineZ.

Schrijf de "Inleiding" sectie voor een trajectplan volgens EXACT deze 8-alinea structuur:

ALINEA 1 - Introductie met naam:
- Formaat: "${empInitials} ${empLastName} (hierna werknemer te noemen) is..."
- Gebruik EXACT de tekst "(hierna werknemer te noemen)" - GEEN variaties zoals "(hierna: werknemer)"
- Vermeld kort de situatie

ALINEA 2 - Medische reden:
- GEBRUIK ALTIJD "medische beperking" (ENKELVOUD) - NOOIT "medische beperkingen" (meervoud)
- Functie in kleine letters: "${currentJob}"
- Eerste ziektedag: ${firstSickDay || 'zie documenten'}
- Voorbeeld: "Werknemer is sinds [datum] arbeidsongeschikt als gevolg van een medische beperking waardoor ${pronSubj.toLowerCase()} niet meer kan werken als ${currentJob}."

ALINEA 3 - Functieomschrijving:
- Begin met "**Functieomschrijving:**" (met vetgedrukt label)
- Haal beschrijving uit documenten of gebruik placeholder indien niet beschikbaar

ALINEA 4 - Aanmelder/Contactpersoon:
- Formaat: "Werknemer is door ${refTitle} ${refInitials} ${refLastName} [functie] ${companyName} aangemeld met het verzoek een 2e spoor re-integratietraject op te starten in het kader van de Wet Verbetering Poortwachter."
- Als er een "extra aanmelder" in documenten staat, gebruik dan: "Werknemer is door [extra aanmelder details] In opdracht van: ${refTitle} ${refInitials} ${refLastName} [functie] ${companyName} aangemeld..."

ALINEA 5 - Medische informatie & FML:
${hasFML ? `
- Begin: "Werknemer vertelt openhartig over de reden van ${pronPoss} ziekmelding en de daarbij horende gezondheidsproblematiek."
- Vervolg: "${pronSubj} heeft medische beperkingen zoals beschreven in de [FML/IZP/LAB - bepaal welke] van ${fmlDate} op het gebied van [extract beperkingen uit hoofdstuk 5 van document]."
` : `
- Begin: "Werknemer vertelt openhartig over de reden van ${pronPoss} ziekmelding, de aanleiding hiervan en de bijbehorende gezondheidsproblemen."
- Vervolg: "${pronInf} geeft aan medische beperkingen te hebben: [vul in indien beschikbaar]."
`}
- EINDIG ALTIJD MET: "Conform de wetgeving rondom de verwerking van persoonsgegevens wordt medische informatie niet geregistreerd in dit rapport."

ALINEA 6 - Spoor 1 re-integratie status:
- Check documenten of werknemer re-integreert in spoor 1
- Als JA: "Op het moment van de intake re-integreert werknemer in spoor 1 door [frequency bijv. twee keer per week] [hours bijv. twee uur] per [aangepaste/eigen] werkzaamheden te verrichten."
- Als NEE: "Werknemer geeft tijdens het intakegesprek aan niet in spoor 1 of elders te re-integreren." [Voeg toe indien contact info: "${pronInf} heeft 2-wekelijks telefonisch contact met ${pronPoss} werkgever."]

ALINEA 7 - Trajectdoel (VASTE TEKST - gebruik exact):
"Tijdens het gesprek is toegelicht wat het doel is van het 2e spoortraject. Werknemer geeft aan het belang van dit traject te begrijpen en hieraan mee te willen werken. In het 2e spoor zal onder andere worden onderzocht welke passende mogelijkheden er op de arbeidsmarkt beschikbaar zijn."

ALINEA 8 - AD-rapport status:
${hasAD ? `
- "In het (Concept) Arbeidsdeskundige rapport opgesteld door ${titleAbbrev} [naam arbeidsdeskundige uit documenten] op ${adDate} staat het volgende:"
- [Vat AD advies samen in 2-3 zinnen]
` : `
- "N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld."
`}

BELANGRIJKE REGELS:
- Gender pronouns: ${pronPoss} (possessive), ${pronSubj} (subject), ${pronInf} (informal)
- Zakelijk en AVG-proof (GEEN diagnoses)
- Gebruik ALLEEN informatie uit de documenten
- Volg de 8-alinea structuur EXACT
- FORMATEER: Gebruik dubbele newlines (\\n\\n) tussen elke alinea voor juiste paragraaf spacing

Return ONLY a JSON object:
{
  "inleiding_main": "string met alinea 1-7 (met \\n\\n tussen alinea's)",
  "inleiding_sub": "string met alinea 8 (AD-rapport deel)"
}
`.trim();
}

// ---- Citation Stripping ----
function stripCitations(text: string): string {
  if (!text) return text;
  
  // Remove all citation patterns:
  let cleaned = text
    // Remove [4:16/filename.pdf] style
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    // Remove 【4:13†source】 style (OpenAI file search annotations)
    .replace(/【[^】]+】/g, '')
    // Remove any other bracket annotations with numbers
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
    
  // Don't modify newlines - let the original formatting from AI remain
  return cleaned;
}

// ---- Assistants API Implementation ----
async function processDocumentsWithAssistant(
  docs: any[],
  context: any
): Promise<{ inleiding_main: string; inleiding_sub: string }> {
  
  console.log('🚀 Creating OpenAI Assistant for Inleiding generation...');
  
  // Step 1: Create assistant with detailed instructions
  const assistant = await openai.beta.assistants.create({
    name: "TP Inleiding Generator",
    instructions: buildInleidingInstructions(context),
    model: "gpt-4o",
    tools: [{ type: "file_search" }]
  });

  console.log('✅ Created assistant:', assistant.id);

  // Step 2: Upload PDFs directly to OpenAI
  const fileIds: string[] = [];
  for (const doc of docs) {
    if (!doc.url) continue;
    
    const path = extractStoragePath(doc.url);
    if (!path) continue;
    
    console.log('📥 Downloading document:', doc.type);
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;
    
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const uploadedFile = await openai.files.create({
      file: new File([buffer], `${doc.type}.pdf`, { type: 'application/pdf' }),
      purpose: "assistants"
    });
    fileIds.push(uploadedFile.id);
    console.log('✅ Uploaded file:', uploadedFile.id);
  }

  if (fileIds.length === 0) {
    throw new Error('No files could be uploaded');
  }

  // Step 3: Create thread with files
  const thread = await openai.beta.threads.create({
    messages: [{
      role: "user",
      content: "Analyseer deze documenten en genereer de Inleiding sectie volgens de instructies.",
      attachments: fileIds.map(id => ({ 
        file_id: id, 
        tools: [{ type: "file_search" }] 
      }))
    }]
  });

  console.log('✅ Created thread:', thread.id);

  // Step 4: Run assistant
  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id
  });

  console.log('✅ Assistant run completed with status:', run.status);
  console.log('🔍 Run details:', JSON.stringify(run, null, 2));

  // Step 5: Get response
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0];
    
    if (response.type === 'text') {
      console.log('📄 Raw assistant response:', response.text.value);
      
      // Clean the response
      let cleanedResponse = response.text.value
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '');
      
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
      }
      
      console.log('🧹 Cleaned response:', cleanedResponse);
      const result = JSON.parse(cleanedResponse);
      
      // Debug: Log the raw AI response to see paragraph formatting
      console.log('🔍 Raw AI inleiding_main:', JSON.stringify(result.inleiding_main));
      console.log('🔍 Raw AI inleiding_sub:', JSON.stringify(result.inleiding_sub));
      
      // Strip citations from the generated text
      result.inleiding_main = stripCitations(result.inleiding_main || '');
      result.inleiding_sub = stripCitations(result.inleiding_sub || '');
      
      console.log('✅ Parsed result:', result);
      
      // Cleanup
      await openai.beta.assistants.delete(assistant.id);
      for (const fileId of fileIds) {
        await openai.files.delete(fileId);
      }
      console.log('✅ Cleaned up assistant and files');
      
      return result;
    }
  }
  
  // Handle different failure states
  if (run.status === 'failed') {
    console.error('❌ Assistant run failed:', run.last_error);
    throw new Error(`Assistant run failed: ${run.last_error?.message || 'Unknown error'}`);
  }
  
  if (run.status === 'cancelled') {
    console.error('❌ Assistant run was cancelled');
    throw new Error('Assistant run was cancelled');
  }
  
  if (run.status === 'expired') {
    console.error('❌ Assistant run expired');
    throw new Error('Assistant run expired');
  }
  
  console.error('❌ Assistant run ended with unexpected status:', run.status);
  throw new Error(`Assistant run failed with status: ${run.status}`);
}

// ---- Main Route Handler ----
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    // Fetch all required data
    const { data: employee } = await supabase
      .from("employees")
      .select("first_name, last_name, client_id")
      .eq("id", employeeId)
      .single();

    const { data: details } = await supabase
      .from("employee_details")
      .select("current_job, gender, contract_hours")
      .eq("employee_id", employeeId)
      .single();

    const { data: meta } = await supabase
      .from("tp_meta")
      .select("*")
      .eq("employee_id", employeeId)
      .single();

    const { data: client } = await supabase
      .from("clients")
      .select("name, referent_first_name, referent_last_name")
      .eq("id", employee?.client_id)
      .single();

    // Fetch all documents
    const { data: docs } = await supabase
      .from("documents")
      .select("type, url, uploaded_at")
      .eq("employee_id", employeeId)
      .order("uploaded_at", { ascending: false });

    if (!docs || docs.length === 0) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }

    // Sort documents by priority
    const docPriority: { [key: string]: number } = {
      'intakeformulier': 1,
      'ad_rapportage': 2,
      'ad_rapport': 2,
      'fml': 3,
      'izp': 3,
      'lab': 3,
      'extra': 4,
    };

    const sortedDocs = docs.sort((a, b) => {
      const aType = (a.type || '').toLowerCase();
      const bType = (b.type || '').toLowerCase();
      const aPriority = docPriority[aType] || 5;
      const bPriority = docPriority[bType] || 5;
      return aPriority - bPriority;
    });

    // Build context object
    const context = { employee, details, meta, client };
    
    // Process documents with assistant
    let extracted;
    try {
      extracted = await processDocumentsWithAssistant(sortedDocs, context);
    } catch (error) {
      console.error('❌ Assistant processing failed, using fallback:', error);
      // Fallback: return basic structure
      extracted = {
        inleiding_main: `[Inleiding voor ${employee?.first_name || 'werknemer'} ${employee?.last_name || ''} - AI generatie mislukt, handmatig invullen vereist]`,
        inleiding_sub: NB_DEFAULT_GEEN_AD
      };
    }
    
    let { inleiding_main, inleiding_sub } = extracted;
    
    // Enforce NB default if no AD
    const hasAD = meta?.has_ad_report || false;
    if (!hasAD || !inleiding_sub) {
      inleiding_sub = NB_DEFAULT_GEEN_AD;
    }
    
    // Persist to database
    await supabase.from("tp_meta").upsert(
      { 
        employee_id: employeeId, 
        inleiding: inleiding_main, 
        inleiding_sub, 
        has_ad_report: hasAD 
      } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { inleiding: inleiding_main, inleiding_sub, has_ad_report: hasAD },
      autofilled_fields: ["inleiding", "inleiding_sub", "has_ad_report"],
    });
  } catch (err: any) {
    console.error("❌ Autofill inleiding error:", err);
    return NextResponse.json({ 
      error: "Server error", 
      details: err?.message 
    }, { status: 500 });
  }
}
