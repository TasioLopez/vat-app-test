import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Document priority order
const DOCUMENT_PRIORITY = {
  'intakeformulier': 1,
  'ad rapport': 2,
  'fml/izp': 3,
  'extra': 4
};

function extractStoragePath(url: string): string | null {
  const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (match?.[1]) return match[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
}

// Helper function to detect file type
function getFileType(path: string, docName?: string): { ext: string; mime: string } {
  const pathLower = path.toLowerCase();
  const nameLower = (docName || '').toLowerCase();
  
  if (pathLower.endsWith('.docx') || nameLower.endsWith('.docx')) {
    return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
  if (pathLower.endsWith('.doc') || nameLower.endsWith('.doc')) {
    return { ext: 'doc', mime: 'application/msword' };
  }
  return { ext: 'pdf', mime: 'application/pdf' };
}

// Helper function to clean and parse assistant response
function parseAssistantResponse(responseText: string): any {
  let cleanedResponse = responseText;
  
  // Remove ```json and ``` markers
  cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Try to find JSON object - look for first { and matching }
  const firstBrace = cleanedResponse.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in response');
  }
  
  // Find the matching closing brace by counting braces
  let braceCount = 0;
  let lastBrace = -1;
  for (let i = firstBrace; i < cleanedResponse.length; i++) {
    if (cleanedResponse[i] === '{') braceCount++;
    if (cleanedResponse[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastBrace = i;
        break;
      }
    }
  }
  
  if (lastBrace === -1) {
    throw new Error('No matching closing brace found');
  }
  
  cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
  
  try {
    return JSON.parse(cleanedResponse);
  } catch (error: any) {
    console.error('❌ JSON parsing error:', error.message);
    console.error('📄 Attempted to parse:', cleanedResponse.substring(0, 200));
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

// Helper function to map and validate extracted data
function mapAndValidateData(extractedData: any): any {
  const fieldMapping: { [key: string]: string } = {
    'geslacht_werknemer': 'gender',
    'geslacht': 'gender',
    'leeftijd_werknemer': 'date_of_birth',
    'naam_werknemer': 'name'
  };
  
  const validEmployeeDetailsFields = [
    'current_job', 'work_experience', 'education_level', 'education_name',
    'drivers_license', 'drivers_license_type', 'transport_type',
    'dutch_speaking', 'dutch_writing', 'dutch_reading', 
    'has_computer', 'computer_skills', 'contract_hours', 'other_employers',
    'gender', 'date_of_birth', 'phone'
  ];
  
  const mappedData: any = {};
  
  Object.entries(extractedData).forEach(([key, value]) => {
    const mappedKey = fieldMapping[key] || key;
    
    // Skip fields that don't belong in employee_details table
    if (!validEmployeeDetailsFields.includes(mappedKey)) {
      console.log(`⚠️ Skipping field "${mappedKey}" - belongs in tp_meta table, not employee_details`);
      return;
    }
    
    // Special handling for date_of_birth - if it's a number (age), skip it
    if (mappedKey === 'date_of_birth' && typeof value === 'number') {
      console.log('⚠️ Skipping age number, expecting date format for date_of_birth');
      return;
    }
    
    // Special handling for contract_hours - convert to number
    if (mappedKey === 'contract_hours') {
      if (typeof value === 'string') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          mappedData[mappedKey] = numValue;
          console.log(`✅ Converted contract_hours from "${value}" to ${mappedData[mappedKey]}`);
        } else {
          console.log(`⚠️ Skipping invalid contract_hours value: "${value}"`);
          return;
        }
      } else if (typeof value === 'number') {
        mappedData[mappedKey] = value;
      } else {
        console.log(`⚠️ Skipping non-numeric contract_hours value: ${value}`);
        return;
      }
    } 
    // Special handling for transport_type - ensure it's an array
    else if (mappedKey === 'transport_type') {
      if (Array.isArray(value)) {
        mappedData[mappedKey] = value;
        console.log(`✅ transport_type is array:`, value);
      } else if (typeof value === 'string' && value.length > 0) {
        mappedData[mappedKey] = [value];
        console.log(`✅ Converted transport_type from string "${value}" to array`);
      } else {
        mappedData[mappedKey] = [];
        console.log(`✅ Set transport_type to empty array`);
      }
    } else {
      mappedData[mappedKey] = value;
    }
  });
  
  return mappedData;
}

// Process intake form document (contains TABLES and text)
async function processIntakeForm(doc: any): Promise<any> {
  console.log(`📋 Processing intake form: ${doc.type}`);
  
  try {
    const path = extractStoragePath(doc.url);
    if (!path) {
      console.log('⚠️ Could not extract storage path for intake form');
      return {};
    }
    
    // Download and upload file
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      console.log('⚠️ Could not download intake form');
      return {};
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(path, doc.name);
    const fileName = `${doc.type}.${fileType.ext}`;
    
    // Create assistant with intake-specific instructions
    const assistant = await openai.beta.assistants.create({
      name: "Intake Form Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse intake formulieren.

BELANGRIJK: Dit intake formulier bevat TABELLEN en vrije tekst.

VELDEN TE EXTRACTEN (employee_details tabel):

TABEL VELDEN (extract uit TABELLEN):

1. transport_type (array): 
   - Zoek de "Vervoer" tabel
   - Voor ELKE rij (Auto, Fiets, Bromfiets, Motor, OV):
     * Kijk naar "Ja" kolom: Als X of vinkje → voeg TOE aan array
     * Kijk naar "Nee" kolom: Als X of vinkje → voeg NIET toe
   - "Rijbewijs" rij negeren (is apart veld drivers_license)
   - Als alle op "Nee" → lege array []

2. computer_skills (1-5):
   STAP-VOOR-STAP:
   1) Zoek de tabel "Kunt u met een computer omgaan" OF "Heeft u een pc thuis"
   2) Lees de RIJ "Heeft u een pc thuis":
      - Als er een X of vinkje in "Ja" kolom STAAT EN er is GEEN notitie zoals "(evt. bij dochter)" of "(bij dochter/familie)" → pc thuis = Ja
      - Als er een X of vinkje in "Nee" kolom STAAT → pc thuis = Nee
      - Als er "Ja" is MAAR met notitie zoals "(evt. bij dochter)" of "(bij dochter/familie)" → pc thuis = Nee (GEEN eigen PC)
   3) Lees de RIJ "Bekend met MS Office":
      - Als X of vinkje in "Ja" kolom → MS Office = Ja
      - Als X of vinkje in "Nee" kolom → MS Office = Nee
   4) BEREKEN computer_skills:
      - Als pc thuis = Nee EN MS Office = Nee → computer_skills = 1
      - Als pc thuis = Nee MAAR MS Office = Ja → computer_skills = 2
      - Als pc thuis = Ja (zonder notitie) EN MS Office = Ja → computer_skills = 3
      - Meer vaardigheden → 4 of 5
   BELANGRIJK: Als beide "Nee" zijn → computer_skills = 1 (NIET 2)

3. has_computer (true/false):
   - Gebruik dezelfde logica als bij computer_skills stap 2
   - Als pc thuis = Ja ZONDER notitie → has_computer = true
   - Als pc thuis = Nee OF met notitie → has_computer = false

4. dutch_speaking/writing/reading ("Niet goed"/"Gemiddeld"/"Goed"):
   STAP-VOOR-STAP:
   1) Zoek de "Talen" tabel in het document
   2) Vind de RIJ "Nederlands" (NIET "Engels", NIET "Turks", ALLEEN "Nederlands")
   3) Lees de KOLOMMEN in deze rij:
      - "Spreken" kolom → dutch_speaking
      - "Schrijven" kolom → dutch_writing  
      - "Lezen" kolom → dutch_reading
   4) Voor ELKE kolom, kijk naar de X of vinkje positie:
      - Als X/vinkje onder "G" (Goed) kolom → "Goed"
      - Als X/vinkje onder "R" (Redelijk) kolom → "Gemiddeld"
      - Als X/vinkje onder "S" (Slecht) kolom → "Niet goed"
   VOORBEELD:
   - Als in "Spreken" kolom de X onder "S" staat → dutch_speaking = "Niet goed"
   - Als in "Schrijven" kolom de X onder "R" staat → dutch_writing = "Gemiddeld"
   - Als in "Lezen" kolom de X onder "G" staat → dutch_reading = "Goed"
   BELANGRIJK: Gebruik ALLEEN wat je ziet. Als X onder "S" staat = "Niet goed", NIET "Gemiddeld" of "Goed"

5. drivers_license (true/false):
   - Zoek "Vervoer" tabel, rij "Rijbewijs"
   - Als "Ja" aangevinkt → true, anders false

6. drivers_license_type ("B"/"C"/"D"/"E"/"A"):
   - Zoek in "Vervoer" tabel of tekst bij "Rijbewijs"

TEKST VELDEN (extract uit vrije tekst):

- current_job: Zoek "Functietitel:" of "Functie:"
- contract_hours: Zoek "Urenomvang" of "Contracturen"
- date_of_birth: Geboortedatum (YYYY-MM-DD), converteer uit leeftijd indien nodig
- gender: "Man" of "Vrouw"
- work_experience: ALLEEN functietitels, gescheiden door komma's (geen datums/jaren/organisaties)
- education_level: Praktijkonderwijs, VMBO, HAVO, VWO, MBO 1-4, HBO, WO
- education_name: Opleiding/cursus naam
- other_employers: VORIGE werkgevers (niet huidige), komma-gescheiden

BELANGRIJK:
- Gebruik ALLEEN wat je ziet in de tabel/tekst
- Maak GEEN aannames

RETURN FORMAT:
Je MOET ALLEEN een JSON object teruggeven, GEEN tekst voor of na.
VOORBEELD:
{"transport_type": ["Auto"], "computer_skills": 2, "has_computer": false, "dutch_speaking": "Niet goed", "dutch_writing": "Niet goed", "dutch_reading": "Niet goed"}
NIET dit:
Hier is de informatie: {"transport_type": ["Auto"]}
NIET markdown, NIET bullet points, NIET uitleg tekst, ALLEEN JSON object.`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    // Upload file
    const uploadedFile = await openai.files.create({
      file: new File([buffer], fileName, { type: fileType.mime }),
      purpose: "assistants"
    });
    
    console.log(`✅ Uploaded intake form (${fileType.mime}):`, uploadedFile.id);
    
    // Create thread and run
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: "Analyseer dit intake formulier en extract de werknemersprofiel velden.",
        attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
      }]
    });
    
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });
    
    if (run.status !== 'completed') {
      throw new Error(`Assistant run failed: ${run.status}`);
    }
    
    // Get response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0];
    
    if (response.type === 'text') {
      console.log('📄 Raw intake form response (first 500 chars):', response.text.value.substring(0, 500));
      const extractedData = parseAssistantResponse(response.text.value);
      const mappedData = mapAndValidateData(extractedData);
      
      // Cleanup
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      
      console.log(`✅ Intake form processing completed:`, Object.keys(mappedData).length, 'fields');
      return mappedData;
    }
    
    // Cleanup on error
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    return {};
    
  } catch (error: any) {
    console.error('❌ Error processing intake form:', error.message);
    console.error('❌ Error stack:', error.stack);
    return {};
  }
}

// Process AD report document (TEXT only, no tables)
async function processADReport(doc: any): Promise<any> {
  console.log(`📋 Processing AD report: ${doc.type}`);
  
  try {
    const path = extractStoragePath(doc.url);
    if (!path) {
      console.log('⚠️ Could not extract storage path for AD report');
      return {};
    }
    
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      console.log('⚠️ Could not download AD report');
      return {};
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(path, doc.name);
    const fileName = `${doc.type}.${fileType.ext}`;
    
    // Create assistant with AD-specific instructions
    const assistant = await openai.beta.assistants.create({
      name: "AD Report Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse AD (arbeidsdeskundige) rapporten.

BELANGRIJK: Dit AD rapport bevat VRIJE TEKST, GEEN tabellen.

VELDEN TE EXTRACTEN (employee_details tabel - ALLEEN uit tekst):

- current_job: Zoek functietitel/beroep in tekst beschrijvingen
- contract_hours: Zoek "Urenomvang" of "Contracturen" in tekst
- date_of_birth: Zoek geboortedatum/leeftijd in tekst (converteer naar YYYY-MM-DD)
- gender: Zoek "Man" of "Vrouw" in tekst
- work_experience: Extract functietitels uit beschrijvingen (ALLEEN functietitels, geen datums/jaren/organisaties)
- education_level: Zoek opleidingsniveau in tekst (Praktijkonderwijs, VMBO, HAVO, VWO, MBO 1-4, HBO, WO)
- education_name: Zoek opleiding/cursus naam in tekst

NIET EXTRACTEN (niet beschikbaar in AD rapporten):
- transport_type (NIET in AD rapport)
- computer_skills (NIET in AD rapport)
- has_computer (NIET in AD rapport)
- dutch_speaking/writing/reading (NIET in AD rapport)
- drivers_license (NIET in AD rapport)
- drivers_license_type (NIET in AD rapport)

BELANGRIJK:
- Extract ALLEEN uit vrije tekst beschrijvingen
- Geen tabellen verwacht

RETURN FORMAT:
Je MOET ALLEEN een JSON object teruggeven, GEEN tekst voor of na.
VOORBEELD:
{"current_job": "Helpende", "contract_hours": 16}
NIET dit:
Hier is de informatie: {"current_job": "Helpende"}
NIET markdown, NIET bullet points, ALLEEN JSON object.`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    const uploadedFile = await openai.files.create({
      file: new File([buffer], fileName, { type: fileType.mime }),
      purpose: "assistants"
    });
    
    console.log(`✅ Uploaded AD report (${fileType.mime}):`, uploadedFile.id);
    
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: "Analyseer dit AD rapport en extract relevante werknemersprofiel velden uit de tekst.",
        attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
      }]
    });
    
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });
    
    if (run.status !== 'completed') {
      throw new Error(`Assistant run failed: ${run.status}`);
    }
    
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0];
    
    if (response.type === 'text') {
      const extractedData = parseAssistantResponse(response.text.value);
      const mappedData = mapAndValidateData(extractedData);
      
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      
      console.log(`✅ AD report processing completed:`, Object.keys(mappedData).length, 'fields');
      return mappedData;
    }
    
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    return {};
    
  } catch (error: any) {
    console.error('❌ Error processing AD report:', error.message);
    return {};
  }
}

// Process FML/IZP document (TEXT only)
async function processFMLIZP(doc: any): Promise<any> {
  console.log(`📋 Processing FML/IZP: ${doc.type}`);
  
  try {
    const path = extractStoragePath(doc.url);
    if (!path) {
      console.log('⚠️ Could not extract storage path for FML/IZP');
      return {};
    }
    
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      console.log('⚠️ Could not download FML/IZP');
      return {};
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(path, doc.name);
    const fileName = `${doc.type}.${fileType.ext}`;
    
    const assistant = await openai.beta.assistants.create({
      name: "FML/IZP Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse FML/IZP documenten.

BELANGRIJK: Dit document bevat VRIJE TEKST, GEEN tabellen.

VELDEN TE EXTRACTEN (employee_details tabel - ALLEEN uit tekst):

- date_of_birth: Zoek geboortedatum in tekst (YYYY-MM-DD format)
- gender: Zoek "Man" of "Vrouw" in tekst
- contract_hours: Zoek urenomvang indien beschikbaar

NIET EXTRACTEN (medische informatie niet relevant voor employee_details):
- transport_type, computer_skills, language_skills, etc. (niet in FML/IZP)

BELANGRIJK:
- Extract ALLEEN uit tekst
- Focus op demografische gegevens

RETURN FORMAT:
Je MOET ALLEEN een JSON object teruggeven, GEEN tekst voor of na.
VOORBEELD:
{"date_of_birth": "1977-01-02", "gender": "Vrouw"}
NIET markdown, NIET bullet points, ALLEEN JSON object.`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    const uploadedFile = await openai.files.create({
      file: new File([buffer], fileName, { type: fileType.mime }),
      purpose: "assistants"
    });
    
    console.log(`✅ Uploaded FML/IZP (${fileType.mime}):`, uploadedFile.id);
    
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: "Analyseer dit FML/IZP document en extract relevante demografische gegevens.",
        attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
      }]
    });
    
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });
    
    if (run.status !== 'completed') {
      throw new Error(`Assistant run failed: ${run.status}`);
    }
    
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0];
    
    if (response.type === 'text') {
      const extractedData = parseAssistantResponse(response.text.value);
      const mappedData = mapAndValidateData(extractedData);
      
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      
      console.log(`✅ FML/IZP processing completed:`, Object.keys(mappedData).length, 'fields');
      return mappedData;
    }
    
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    return {};
    
  } catch (error: any) {
    console.error('❌ Error processing FML/IZP:', error.message);
    return {};
  }
}

// Process extra document (TEXT only, generic fallback)
async function processExtraDoc(doc: any): Promise<any> {
  console.log(`📋 Processing extra document: ${doc.type}`);
  
  try {
    const path = extractStoragePath(doc.url);
    if (!path) {
      console.log('⚠️ Could not extract storage path for extra document');
      return {};
    }
    
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      console.log('⚠️ Could not download extra document');
      return {};
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = getFileType(path, doc.name);
    const fileName = `${doc.type}.${fileType.ext}`;
    
    const assistant = await openai.beta.assistants.create({
      name: "Extra Document Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse werknemersdocumenten.

BELANGRIJK: Dit document bevat VRIJE TEKST, GEEN tabellen.

VELDEN TE EXTRACTEN (employee_details tabel - ALLEEN uit tekst):

- current_job: Zoek functietitel/beroep in tekst
- contract_hours: Zoek urenomvang in tekst
- date_of_birth: Zoek geboortedatum (YYYY-MM-DD)
- gender: Zoek "Man" of "Vrouw"
- work_experience: Extract functietitels uit tekst
- education_level: Zoek opleidingsniveau in tekst

BELANGRIJK:
- Extract ALLEEN uit tekst

RETURN FORMAT:
Je MOET ALLEEN een JSON object teruggeven, GEEN tekst voor of na.
VOORBEELD:
{"current_job": "Helpende", "contract_hours": 16}
NIET markdown, NIET bullet points, ALLEEN JSON object.`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    const uploadedFile = await openai.files.create({
      file: new File([buffer], fileName, { type: fileType.mime }),
      purpose: "assistants"
    });
    
    console.log(`✅ Uploaded extra document (${fileType.mime}):`, uploadedFile.id);
    
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: "Analyseer dit document en extract relevante werknemersprofiel velden.",
        attachments: [{ file_id: uploadedFile.id, tools: [{ type: "file_search" }] }]
      }]
    });
    
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });
    
    if (run.status !== 'completed') {
      throw new Error(`Assistant run failed: ${run.status}`);
    }
    
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0];
    
    if (response.type === 'text') {
      const extractedData = parseAssistantResponse(response.text.value);
      const mappedData = mapAndValidateData(extractedData);
      
      await openai.beta.assistants.delete(assistant.id);
      await openai.files.delete(uploadedFile.id);
      
      console.log(`✅ Extra document processing completed:`, Object.keys(mappedData).length, 'fields');
      return mappedData;
    }
    
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(uploadedFile.id);
    return {};
    
  } catch (error: any) {
    console.error('❌ Error processing extra document:', error.message);
    return {};
  }
}

// Main function: Process documents separately and merge with priority
async function processDocumentsSeparately(docs: any[]): Promise<any> {
  console.log('🚀 Processing documents separately with document-specific instructions...');
  
  const results: any = {};
  const processedDocs: string[] = [];
  
  // 1. Process intake form (highest priority)
  const intakeDoc = docs.find(d => {
    const type = (d.type || '').toLowerCase();
    return type.includes('intake');
  });
  
  if (intakeDoc) {
    console.log('📄 Processing intake form (priority 1)...');
    const intakeResult = await processIntakeForm(intakeDoc);
    Object.assign(results, intakeResult);
    processedDocs.push('intakeformulier');
    console.log(`✅ Intake form: ${Object.keys(intakeResult).length} fields extracted`);
  }
  
  // 2. Process AD report (second priority) - only fill missing fields
  const adDoc = docs.find(d => {
    const type = (d.type || '').toLowerCase();
    return type.includes('ad') || type.includes('arbeidsdeskundig');
  });
  
  if (adDoc) {
    console.log('📄 Processing AD report (priority 2)...');
    const adResult = await processADReport(adDoc);
    // Only merge fields that are missing
    Object.keys(adResult).forEach(key => {
      if (!results[key] || results[key] === null || results[key] === '') {
        results[key] = adResult[key];
      }
    });
    processedDocs.push('ad_rapport');
    console.log(`✅ AD report: ${Object.keys(adResult).length} fields extracted`);
  }
  
  // 3. Process FML/IZP (third priority) - only fill missing fields
  const fmlDoc = docs.find(d => {
    const type = (d.type || '').toLowerCase();
    return type === 'fml' || type === 'izp' || type === 'lab';
  });
  
  if (fmlDoc) {
    console.log('📄 Processing FML/IZP (priority 3)...');
    const fmlResult = await processFMLIZP(fmlDoc);
    Object.keys(fmlResult).forEach(key => {
      if (!results[key] || results[key] === null || results[key] === '') {
        results[key] = fmlResult[key];
      }
    });
    processedDocs.push('fml/izp');
    console.log(`✅ FML/IZP: ${Object.keys(fmlResult).length} fields extracted`);
  }
  
  // 4. Process extra documents (lowest priority) - only fill missing fields
  const extraDocs = docs.filter(d => {
    const type = (d.type || '').toLowerCase();
    return !type.includes('intake') && 
           !type.includes('ad') && 
           !type.includes('arbeidsdeskundig') &&
           type !== 'fml' && 
           type !== 'izp' && 
           type !== 'lab';
  });
  
  if (extraDocs.length > 0) {
    console.log(`📄 Processing ${extraDocs.length} extra document(s) (priority 4)...`);
    for (const extraDoc of extraDocs) {
      const extraResult = await processExtraDoc(extraDoc);
      Object.keys(extraResult).forEach(key => {
        if (!results[key] || results[key] === null || results[key] === '') {
          results[key] = extraResult[key];
        }
      });
    }
    processedDocs.push('extra');
    console.log(`✅ Extra documents: processed`);
  }
  
  console.log(`✅ Document processing completed. Processed: ${processedDocs.join(', ')}. Total fields: ${Object.keys(results).length}`);
  
  return results;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing employeeId',
        data: { details: {} }
      }, { status: 400 });
    }

    console.log('🔍 Processing employee:', employeeId);

    // Fetch documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('Database error:', docsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        data: { details: {} }
      }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: { details: {} },
        message: 'No documents found for this employee'
      });
    }

    console.log('📄 Found documents:', docs.length);

    // Process documents separately
    const details = await processDocumentsSeparately(docs);
    
    if (Object.keys(details).length === 0) {
      console.error('❌ No data extracted from documents');
      return NextResponse.json({ 
        success: false, 
        data: { details: {} },
        message: 'Geen relevante informatie gevonden in de documenten'
      });
    }
    
    console.log('✅ Document processing completed');

    return NextResponse.json({
      success: true,
      data: {
        details,
        autofilled_fields: Object.keys(details)
      },
      message: `Employee information successfully extracted from ${docs.length} documents using separate document processing`
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Processing failed', 
      details: error.message,
      data: { details: {} }
    }, { status: 500 });
  }
}
