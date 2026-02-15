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

// ---- Build Detailed Assistant Instructions ----
function buildInleidingInstructions(
  context: any,
  medischeSituatieText?: string | null,
  adRapportText?: string | null,
  functiebeschrijvingText?: string | null
): string {
  const { employee, details, meta, client } = context;
  
  // Extract only the quote content from AD report
  const adQuoteText = extractAdQuote(adRapportText);
  
  const gender = details?.gender;
  const isMale = gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'man' || gender?.toLowerCase() === 'm';
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
  const intakeDate = nlDate(meta?.intake_date);
  
  const refInitials = getInitials(client?.referent_first_name);
  const refLastName = client?.referent_last_name || '';
  const refTitle = getTitlePrefix(client?.referent_gender);
  const companyName = client?.name || '';
  
  // Fix gender in ALINEA 2 - use isMale variable
  const genderWord = isMale ? 'man' : 'vrouw';
  
  return `
Je bent een Nederlandse re-integratie rapportage specialist voor ValentineZ.

Maak de Inleiding sectie in de schrijfstijl van professionele re-integratierapporten. Schrijf zakelijk en maak waar nodig formeel.

SCHRIJF EXACT 7 ALINEA'S MET dubbele newlines TUSSEN ELKE ALINEA:

ALINEA 1 - Datum intake:
- Begin met: "Ik heb ${title} ${empInitials} ${empLastName} (hierna werknemer te noemen) gesproken op ${intakeDate || '[datum intake]'}."
- BELANGRIJK: Gebruik EXACT "(hierna werknemer te noemen)" - GEEN variaties

ALINEA 2 - Introductie met medische situatie (ALGEMEEN):
- Formaat: "Werknemer is een [leeftijd indien bekend]-jarige ${genderWord} die als gevolg van een medische beperking is uitgevallen voor ${pronPoss} functie als ${currentJob} bij ${companyName}${details?.contract_hours ? `, voor ${details.contract_hours} uur per week` : ''}."
- Voeg toe: "${pronSubj} is sinds ${firstSickDay || '[datum]'} arbeidsongeschikt geraakt."
- GEBRUIK ALTIJD "medische beperking" (ENKELVOUD en ALGEMEEN) - NOOIT specifieke lichaamsdelen of diagnoses
- BELANGRIJK: Beschrijf medische beperkingen ALLEEN in algemene termen zoals "fysieke beperking", "medische beperking", "functionele beperking" - NOOIT specifieke lichaamsdelen of details

ALINEA 3 - Functieomschrijving (GEDETAILLEERD):
${functiebeschrijvingText ? `
- Gebruik DEZE informatie uit het intake formulier (sectie "7. Arbeidsdeskundige rapport") als basis:
${functiebeschrijvingText}

- Begin met "**Functieomschrijving:**" (met vetgedrukt label via markdown)
- Voeg direct na de dubbele punt een newline toe, zodat de rest van de tekst op een nieuwe regel begint
- Gebruik de bovenstaande informatie uit het intake formulier EXACT zoals gegeven
- Neem de tekst onder "Conclusie/advies:" over als functieomschrijving
- Als de beschrijving onvolledig is, vul aan met informatie uit andere documenten (AD rapport, etc.)
` : `
- Begin met "**Functieomschrijving:**" (met vetgedrukt label via markdown)
- Voeg direct na de dubbele punt een newline toe, zodat de rest van de tekst op een nieuwe regel begint
- PRIORITEIT: Zoek EERST in intake formulier (sectie "7. Arbeidsdeskundige rapport"), dan in AD rapport, dan in andere documenten
- Beschrijf taken, verantwoordelijkheden, werkplek, uren per week
- Als niet in documenten: schrijf "..." als placeholder
- Wees zo specifiek en gedetailleerd mogelijk
`}

ALINEA 4 - Aanmelder/Contactpersoon (controleer Extra Aanmelder):
- Check eerst of er een "Extra Aanmelder" is ingevuld in de documenten
- ALS Extra Aanmelder BESTAAT: "Werknemer is door ${refTitle} [Voorletter. Achternaam Extra Aanmelder], [functie Extra Aanmelder] bij [bedrijf Extra Aanmelder] In opdracht van: ${refTitle} ${refInitials} ${refLastName}, [functie contactpersoon] ${companyName} aangemeld met het verzoek een 2e spoor re-integratietraject op te starten in het kader van de Wet Verbetering Poortwachter."
- ALS GEEN Extra Aanmelder: "Werknemer is door ${refTitle} ${refInitials} ${refLastName}, [functie contactpersoon] ${companyName} aangemeld met het verzoek een 2e spoor re-integratietraject op te starten in het kader van de Wet Verbetering Poortwachter."
- Gebruik correcte geslachtsaanduidingen (meneer/mevrouw) voor contactpersonen

ALINEA 5 - Medische informatie (ALGEMEEN - GEEN SPECIFIEKE DETAILS):
${medischeSituatieText ? `
- Gebruik DEZE informatie uit het intake formulier (sectie "Medische situatie") als basis:
${medischeSituatieText}

- Begin: "Werknemer vertelt openhartig over de reden van ${pronPoss} ziekmelding en de daarbij horende gezondheidsproblematiek."
- Baseer de beschrijving van beperkingen op de FML-beperkingen uit bovenstaande intake informatie
- Gebruik ALLEEN de algemene categorieën zoals genoemd in de intake (bijv. "Persoonlijk functioneren", "Sociaal Functioneren", "Dynamische handelingen", "Statische houdingen", "aanpassingen fysieke omgevingseisen", "Werktijden")
` : `
- Begin: "Werknemer vertelt openhartig over de reden van ${pronPoss} ziekmelding en de daarbij horende gezondheidsproblematiek."
${hasFML ? `
- Vervolg: "${pronSubj} heeft medische beperkingen zoals beschreven in de FML van ${fmlDate}."
- BELANGRIJK: Beschrijf beperkingen ALLEEN in algemene categorieën zoals:
  * "persoonlijk en sociaal functioneren"
  * "dynamische handelingen" 
  * "statische houdingen"
  * "aanpassing aan fysieke omgevingseisen"
  * "werktijden"
` : `
- Vervolg: "${pronInf} geeft aan medische beperkingen te hebben op fysiek en/of mentaal vlak."
`}
`}
- STRIKT VERBODEN: Noem NOOIT specifieke lichaamsdelen, diagnoses, of medische details
- EINDIG ALTIJD MET: "Conform de wetgeving rondom de verwerking van persoonsgegevens wordt medische informatie niet geregistreerd in dit rapport."

ALINEA 6 - Spoor 1 re-integratie status:
- Check documenten of werknemer re-integreert in spoor 1
- ALS JA: "Op het moment van de intake re-integreert werknemer in spoor 1 door [details uit documenten]."
- ALS NEE: "Werknemer geeft tijdens het intakegesprek aan niet in spoor 1 of elders te re-integreren. ${pronInf} heeft [frequency indien bekend] contact met ${pronPoss} werkgever."

ALINEA 7 - Trajectdoel (VASTE TEKST):
"Tijdens het gesprek is toegelicht wat het doel is van het 2e spoortraject. Werknemer geeft aan het belang van dit traject te begrijpen en hieraan mee te willen werken. In het 2e spoor zal onder andere worden onderzocht welke passende mogelijkheden er op de arbeidsmarkt beschikbaar zijn."

VOOR inleiding_sub (APARTE OUTPUT FIELD):
${adQuoteText ? `
- Gebruik DEZE exacte tekst uit het intake formulier (sectie "7. Arbeidsdeskundige rapport", onder "Conclusie/advies:"):
${adQuoteText}

- Output ALLEEN deze exacte structuur:

**In het Arbeidsdeskundige rapport, opgesteld door ${titleAbbrev} [naam uit intake] op ${adDate || '[datum uit intake]'}, staat het volgende:** *${adQuoteText}*

- KRITIEKE FORMATTING REGELS:
  * De tekst "In het Arbeidsdeskundige rapport, opgesteld door [naam] op [datum], staat het volgende:" moet ALTIJD vetgedrukt zijn met **tekst**
  * Alleen de citaat tekst na de dubbele punt krijgt italic markdown: *tekst*
  * GEEN quotes rondom de citaat, alleen asterisken
  * Output ALLEEN EEN KEER
  
- VOORBEELD (kopieer dit format EXACT):
**In het Arbeidsdeskundige rapport, opgesteld door dhr. R. Teegelaar op 15 januari 2026, staat het volgende:** *Werknemer bouwt op bij de eigen werkgever. Hij gaat ook weer opbouwen in het eigen werk. Indien terugkeer in het eigen werk niet lukt zijn er andere alternatieven voor ander werk bij de eigen werkgever zoals buschauffeur. Formeel is werknemer wel langer dan een jaar ziek en moet er een 2e spoor traject gestart worden. Focus blijft wel gericht op een terugkeer in passend werk bij de eigen werkgever.*
` : hasAD || hasFML ? `
- Begin met vetgedrukte tekst: **In het Arbeidsdeskundige rapport, opgesteld door ${titleAbbrev} [volledige naam arbeidsdeskundige uit documenten] op ${adDate || fmlDate}, staat het volgende:**
- CITEER het VOLLEDIGE advies uit het AD-rapport met italic markdown: *citaat*
- Neem de complete passage over inclusief:
  * Advies over passende arbeid binnen eigen werkgever
  * Monitoren van re-integratiemogelijkheden
  * Startadvies (bijv. "2 x 2 uur per week")
  * Opbouwschema (bijv. "met een opbouw van één uur per dag per twee weken")
  * Reden voor 2e spoor advies
- BELANGRIJK: Gebruik LETTERLIJKE CITAAT uit document, inclusief exacte getallen en schema's
- BELANGRIJK: De intro "In het Arbeidsdeskundige rapport... staat het volgende:" moet vetgedrukt zijn (**), het citaat daarna italic (*)
- Formaat: **In het Arbeidsdeskundige rapport... staat het volgende:** *citaat in italic*
` : `
- "N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld."
`}

KRITIEKE FORMAAT REGELS:
- Schrijf als voorletter(s). achternaam voor alle personen (bijv. "K. Baaijens" niet "Kim Baaijens")
- Gender pronouns: ${pronPoss} (bezittelijk), ${pronSubj} (onderwerp), ${pronInf} (informeel)
- Gebruik ${refTitle} voor meneer/mevrouw
- ELKE alinea eindigt met dubbele newline voor paragraph spacing
- Wees VOLLEDIG en GEDETAILLEERD - haal ALLE relevante informatie uit documenten
- Zakelijk en AVG-proof (GEEN medische diagnoses of specifieke lichaamsdelen)
- STRIKT: Medische informatie altijd algemeen houden - geen specifieke details

Return ONLY a JSON object:
{
  "inleiding_main": "string met alinea 1-7 (VERPLICHT dubbele newlines tussen ELKE alinea)",
  "inleiding_sub": "string met AD-rapport citaat of NB tekst"
}
`.trim();
}

// ---- Helper Functions ----
function extractAdQuote(adRapportText: string | null | undefined): string | null {
  if (!adRapportText) return null;
  // Extract content after "Conclusie/advies:"
  const match = adRapportText.match(/Conclusie\/advies:?\s*(.+)/is);
  return match?.[1]?.trim() || adRapportText.trim();
}

function extractAdDate(adRapportText: string | null | undefined): string | null {
  if (!adRapportText) return null;
  // Try to find date patterns like "Datum rapport: 15-1-2026" or "Datum: 15 januari 2026"
  const datePatterns = [
    /Datum\s+rapport:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /Datum:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /Datum\s+rapport:?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
    /Datum:?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = adRapportText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractAdName(adRapportText: string | null | undefined): string | null {
  if (!adRapportText) return null;
  // Try to find name patterns like "opgesteld door dhr. R. Teegelaar" or "Arbeidsdeskundige: [naam]"
  const namePatterns = [
    /opgesteld\s+door\s+(?:dhr\.|mevr\.|drs\.|mr\.|dr\.)?\s*([A-Z]\.?\s*[A-Z][a-z]+)/i,
    /Arbeidsdeskundige:?\s*([A-Z]\.?\s*[A-Z][a-z]+)/i,
    /door\s+(?:dhr\.|mevr\.|drs\.|mr\.|dr\.)?\s*([A-Z]\.?\s*[A-Z][a-z]+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = adRapportText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

function removeDuplicateQuotes(text: string): string {
  if (!text) return text;
  
  // First, fix common formatting issues
  // Remove bold from quotes: **"text"* -> *text*
  text = text.replace(/\*\*\"([^\"]+)\"\*/g, '*$1*');
  // Remove quotes around italic: "*text*" -> *text*
  text = text.replace(/\"\*([^*]+)\*\"+/g, '*$1*');
  // Remove quotes that wrap italic: "*text*" -> *text*
  text = text.replace(/\"+\*([^*]+)\*\"+/g, '*$1*');
  
  // Remove duplicate quoted blocks with various patterns:
  // Pattern 1: *quote* followed by *quote* (markdown italic)
  text = text.replace(/(\*[^*]+\*)\s*\1+/g, '$1');
  
  // Pattern 2: "quote" followed by "quote" (with quotes)
  text = text.replace(/(\"[^\"]+\")\s*\1+/g, '$1');
  
  // Pattern 3: Mixed patterns - find duplicate content regardless of formatting
  const quotePattern = /(\*[^*]+\*|\"[^\"]+\"|\*\*[^*]+\*\*)/g;
  const matches = [...text.matchAll(quotePattern)];
  
  if (matches.length >= 2) {
    // Extract content from each match (remove formatting)
    const contents = matches.map(m => {
      const content = m[0];
      return content.replace(/[\*\"\s]+/g, '').trim();
    });
    
    // If first two are identical, remove the second
    if (contents[0] && contents[0] === contents[1]) {
      const firstEnd = matches[0].index! + matches[0][0].length;
      const secondStart = matches[1].index!;
      const secondEnd = matches[1].index! + matches[1][0].length;
      
      // Remove the duplicate
      text = text.substring(0, secondStart) + text.substring(secondEnd);
    }
  }
  
  return text;
}

function fixItalicFormatting(text: string): string {
  if (!text) return text;
  
  // Pattern: "In het Arbeidsdeskundige rapport... staat het volgende:" should be BOLD, not italic
  // The quote after should remain italic
  
  // Find the pattern where intro is incorrectly italic (*...*) - convert to bold (**...**)
  const introPattern = /(\*In het Arbeidsdeskundige rapport[^*]+staat het volgende:\*)\s*(\*[^*]+\*)/;
  const match = text.match(introPattern);
  
  if (match) {
    const intro = match[1].replace(/\*/g, '');
    const quote = match[2];
    text = text.replace(introPattern, `**${intro}** ${quote}`);
  }
  
  // Also handle cases where the entire thing is wrapped in asterisks
  const fullWrapPattern = /^\*([^*]+staat het volgende:)\s*(\*[^*]+\*)\*$/;
  const fullMatch = text.match(fullWrapPattern);
  if (fullMatch) {
    return `**${fullMatch[1]}** ${fullMatch[2]}`;
  }
  
  return text;
}

/** Ensures the intro phrase is always bold. Adds ** if the intro is plain text. */
function ensureBoldIntro(text: string): string {
  if (!text) return text;
  // Skip if it's the N.B. default (no AD report)
  if (text.includes('N.B.:') && text.includes('nog geen AD-rapport')) return text;

  // Match intro only when NOT already wrapped in ** (negative lookbehind/lookahead)
  const plainIntroPattern = /(?<!\*\*)(In het Arbeidsdeskundige rapport, opgesteld door [^:]+staat het volgende:)(?!\*\*)/;
  return text.replace(plainIntroPattern, '**$1**');
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
    // Clean up multiple SPACES only (not newlines!) - use space character class
    .replace(/ {2,}/g, ' ')
    .trim();
    
  // Don't modify newlines - let the original formatting from AI remain
  return cleaned;
}

// ---- Assistants API Implementation ----
async function processDocumentsWithAssistant(
  docs: any[],
  context: any,
  medischeSituatieText?: string | null,
  adRapportText?: string | null,
  functiebeschrijvingText?: string | null
): Promise<{ inleiding_main: string; inleiding_sub: string }> {
  
  console.log('🚀 Creating OpenAI Assistant for Inleiding generation...');
  
  // Step 1: Create assistant with detailed instructions
  const assistant = await openai.beta.assistants.create({
    name: "TP Inleiding Generator",
    instructions: buildInleidingInstructions(context, medischeSituatieText, adRapportText, functiebeschrijvingText),
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
      result.inleiding_sub = ensureBoldIntro(fixItalicFormatting(removeDuplicateQuotes(stripCitations(result.inleiding_sub || ''))));
      
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
      .select("*, intake_date")
      .eq("employee_id", employeeId)
      .single();

    const { data: client } = await supabase
      .from("clients")
      .select("name, referent_first_name, referent_last_name, referent_gender")
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

    // Extract specific sections from intake form BEFORE processing
    console.log('📋 Extracting sections from intake form...');
    const medischeSituatieText = await extractIntakeSection(employeeId, "5. Medische situatie");
    const adRapportText = await extractIntakeSection(employeeId, "7. Arbeidsdeskundige rapport");
    // Use section 7 for functieomschrijving instead of section 3
    const functiebeschrijvingText = await extractIntakeSection(employeeId, "7. Arbeidsdeskundige rapport");
    
    if (medischeSituatieText) {
      console.log('✅ Extracted Medische situatie from intake form');
    }
    if (adRapportText) {
      console.log('✅ Extracted Arbeidsdeskundige rapport from intake form');
    }
    if (functiebeschrijvingText) {
      console.log('✅ Extracted Arbeidsdeskundige rapport (for Functieomschrijving) from intake form');
    }
    
    // Build context object
    const context = { employee, details, meta, client };
    
    // Process documents with assistant, passing pre-extracted sections
    let extracted;
    try {
      extracted = await processDocumentsWithAssistant(sortedDocs, context, medischeSituatieText, adRapportText, functiebeschrijvingText);
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
