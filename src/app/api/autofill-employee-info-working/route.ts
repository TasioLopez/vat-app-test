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

// NEW APPROACH: OpenAI Assistants API for document processing (same as TP-2)
async function processDocumentsWithAssistant(docs: any[]): Promise<any> {
  console.log('🚀 Using OpenAI Assistants API for employee document processing...');
  
  try {
    // Step 1: Create assistant with instructions
    const assistant = await openai.beta.assistants.create({
      name: "Employee Document Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse werknemersdocumenten.

BELANGRIJKE PRIORITEIT: Documenten zijn gesorteerd op prioriteit:
1. INTAKEFORMULIER (hoogste prioriteit - gebruik deze informatie bij conflicten)
2. AD RAPPORT (tweede prioriteit)
3. FML/IZP (derde prioriteit)
4. EXTRA (laagste prioriteit)

BELANGRIJK: Je MOET alle velden invullen met EXACTE informatie uit de documenten.

Zoek specifiek naar deze informatie in de documenten (ALLEEN voor employee_details tabel):
- Functietitel (current_job) - VERPLICHT, zoek naar "Functietitel:" of "Functie:"
- Urenomvang functie (contract_hours) - VERPLICHT, zoek naar "Urenomvang" of "Contracturen"
- Leeftijd werknemer (date_of_birth) - converteer naar geboortedatum (bijv. "1968-01-15")
- Geslacht werknemer (gender) - "Man" of "Vrouw"
- Relevante werkervaring (work_experience) - Extract ALLEEN functietitels/beroepen (bijv. "Verloskundige, Verzorgende IG, Helpende"). Geen datums, jaren, of organisatienamen. Alleen de functietitels, gescheiden door komma's.
- Opleidingsniveau (education_level) - kies uit: Praktijkonderwijs, VMBO, HAVO, VWO, MBO 1, MBO 2, MBO 3, MBO 4, HBO, WO
- Opleidingsspecialisatie (education_name) - de naam van de opleiding/cursus (bijv. "Agogisch werk", "Bedrijfskunde")
- Rijbewijs (drivers_license) - true/false
- Rijbewijstype (drivers_license_type) - indien van toepassing: "B", "C", "D", "E", "A"
- Vervoertype (transport_type) - array van transportopties: ["Auto", "Fiets", "Bromfiets", "Motor", "OV"]. 
  BELANGRIJK: Lees de "Vervoer" tabel in het intake formulier. Alleen de opties met "Ja" aangevinkt moeten in de array worden opgenomen. 
  Als "Auto" op "Nee" staat, voeg "Auto" NIET toe aan de array. 
  Als "Fiets" op "Nee" staat, voeg "Fiets" NIET toe aan de array.
  Als "OV" op "Nee" staat, voeg "OV" NIET toe aan de array.
  "Rijbewijs" is een apart veld (drivers_license), niet transport_type.
  Als alle vervoeropties op "Nee" staan, gebruik lege array [].
- Computervaardigheden (computer_skills) - 1-5: 1=Geen, 2=Basis, 3=Gemiddeld, 4=Gevorderd, 5=Expert. 
  Lees de checkbox tabel "Kunt u met een computer omgaan" in het intake formulier:
  - "Heeft u een pc thuis": Als dit "Ja" is MAAR er staat een notitie zoals "(evt. bij dochter)" of "(bij dochter)" of "(bij familie)", dan betekent dit dat de persoon GEEN eigen PC heeft → behandel als "Nee".
  - "Bekend met MS Office": Check of dit "Ja" of "Nee" is.
  Logica: 
  - Als "Heeft u een pc thuis" = Nee (of met notitie dat het bij iemand anders is) EN "Bekend met MS Office" = Nee → 1 (Geen)
  - Als "Heeft u een pc thuis" = Nee (of met notitie) MAAR "Bekend met MS Office" = Ja → 2 (Basis)
  - Als "Heeft u een pc thuis" = Ja (zonder notitie) EN "Bekend met MS Office" = Ja → 3 (Gemiddeld)
  - Als er meer vaardigheden zijn vermeld → 4 (Gevorderd) of 5 (Expert)
- Taalvaardigheid Nederlands (dutch_speaking, dutch_writing, dutch_reading) - kies uit: "Niet goed", "Gemiddeld", "Goed". 
  Gebruik de intake form "Talen" tabel met G/R/S (Goed/Redelijk/Slecht) voor "Nederlands" en map naar de 3-niveau schaal: 
  G (Goed) → "Goed", 
  R (Redelijk) → "Gemiddeld", 
  S (Slecht) → "Niet goed". 
  Lees de kolommen "Spreken", "Schrijven", en "Lezen" voor dutch_speaking, dutch_writing, en dutch_reading respectievelijk.
  Als niet gevonden, gebruik "Gemiddeld" als standaard.
- Heeft computer thuis (has_computer) - true/false. 
  Lees de checkbox "Heeft u een pc thuis" in het intake formulier. 
  BELANGRIJK: Als er een notitie staat zoals "(evt. bij dochter)" of "(bij dochter)" of "(bij familie)", dan betekent dit dat de persoon GEEN eigen PC heeft → gebruik false.
  Alleen als "Heeft u een pc thuis" = Ja ZONDER notitie → gebruik true.
- Vorige werkgevers (other_employers) - ALLEEN VORIGE werkgevers, NIET de huidige werkgever. Scheid met komma's.

BELANGRIJK: 
- Het veld "other_employers" is ALLEEN voor VORIGE werkgevers, niet de huidige werkgever.
- De huidige werkgever staat al in het systeem en hoeft NIET in other_employers.
- Gebruik exacte veldnamen: current_job, work_experience, education_level, education_name, drivers_license, drivers_license_type, transport_type (als array), computer_skills, other_employers, etc.

Bij conflicterende informatie, geef ALTIJD voorrang aan het INTAKEFORMULIER.

Return ONLY a JSON object with the fields you find.`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });

    console.log('✅ Created assistant:', assistant.id);

    // Step 2: Upload documents directly to OpenAI with correct MIME types
    const fileIds: string[] = [];
    for (const doc of docs) {
      if (!doc.url) continue;
      
      const path = extractStoragePath(doc.url);
      if (!path) continue;
      
      console.log('📥 Downloading document for upload:', doc.type);
      const { data: file } = await supabase.storage.from('documents').download(path);
      if (!file) continue;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Detect file type from path extension or document name
      const getFileType = (path: string, docName?: string): { ext: string; mime: string } => {
        const pathLower = path.toLowerCase();
        const nameLower = (docName || '').toLowerCase();
        
        // Check for DOCX
        if (pathLower.endsWith('.docx') || nameLower.endsWith('.docx')) {
          return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        }
        // Check for DOC
        if (pathLower.endsWith('.doc') || nameLower.endsWith('.doc')) {
          return { ext: 'doc', mime: 'application/msword' };
        }
        // Default to PDF
        return { ext: 'pdf', mime: 'application/pdf' };
      };
      
      const fileType = getFileType(path, doc.name);
      const fileName = `${doc.type}.${fileType.ext}`;
      
      console.log(`📄 Detected file type: ${fileType.ext} (${fileType.mime}) for document: ${doc.type}`);
      
      const uploadedFile = await openai.files.create({
        file: new File([buffer], fileName, { type: fileType.mime }),
        purpose: "assistants"
      });
      fileIds.push(uploadedFile.id);
      console.log(`✅ Uploaded file (${fileType.mime}):`, uploadedFile.id);
    }

    if (fileIds.length === 0) {
      throw new Error('No files could be uploaded');
    }

    // Step 3: Create thread with files
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: "Analyseer deze documenten en extract de werknemersprofiel velden.",
        attachments: fileIds.map(id => ({ file_id: id, tools: [{ type: "file_search" }] }))
      }]
    });

    console.log('✅ Created thread:', thread.id);

    // Step 4: Run assistant
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });

    console.log('✅ Assistant run completed with status:', run.status);

    // Step 5: Get response
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0].content[0];
      if (response.type === 'text') {
        console.log('📄 Raw assistant response:', response.text.value);
        
        // Clean the response by removing markdown formatting
        let cleanedResponse = response.text.value;
        
        // Remove ```json and ``` markers
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Remove any text before the first { and after the last }
        const firstBrace = cleanedResponse.indexOf('{');
        const lastBrace = cleanedResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
        }
        
        console.log('🧹 Cleaned response:', cleanedResponse);
        
        const extractedData = JSON.parse(cleanedResponse);
        console.log('✅ Parsed extracted data:', extractedData);
        
        // Map any incorrect field names to correct database column names
        const fieldMapping: { [key: string]: string } = {
          'geslacht_werknemer': 'gender',
          'geslacht': 'gender',
          'leeftijd_werknemer': 'date_of_birth',
          'naam_werknemer': 'name'
        };
        
        // Fields that belong in employee_details table (not tp_meta)
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
          
          // Special handling for contract_hours - convert to number (allow decimals)
          if (mappedKey === 'contract_hours') {
            if (typeof value === 'string') {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                mappedData[mappedKey] = numValue; // Keep decimal values
                console.log(`✅ Converted contract_hours from "${value}" to ${mappedData[mappedKey]}`);
              } else {
                console.log(`⚠️ Skipping invalid contract_hours value: "${value}"`);
                return;
              }
            } else if (typeof value === 'number') {
              mappedData[mappedKey] = value; // Keep decimal values
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
              // Convert single string to array
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
        
        console.log('✅ Mapped field names:', mappedData);
        
        // Cleanup
        await openai.beta.assistants.delete(assistant.id);
        for (const fileId of fileIds) {
          await openai.files.delete(fileId);
        }
        console.log('✅ Cleaned up assistant and files');
        
        return mappedData;
      }
    }

    throw new Error(`Assistant run failed: ${run.status}`);
  } catch (error: any) {
    console.error('❌ Assistants API error:', error.message);
    return {};
  }
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

    // Sort documents by priority
    const sortedDocs = docs.sort((a, b) => {
      const aType = (a.type || '').toLowerCase();
      const bType = (b.type || '').toLowerCase();
      const aPriority = DOCUMENT_PRIORITY[aType as keyof typeof DOCUMENT_PRIORITY] || 999;
      const bPriority = DOCUMENT_PRIORITY[bType as keyof typeof DOCUMENT_PRIORITY] || 999;
      return aPriority - bPriority;
    });

    console.log('🤖 Processing documents with Assistants API...');

    // Process documents with Assistants API (same approach as TP-2)
    const details = await processDocumentsWithAssistant(sortedDocs);
    
    if (Object.keys(details).length === 0) {
      console.error('❌ No data extracted from documents');
      return NextResponse.json({ 
        success: false, 
        data: { details: {} },
        message: 'Geen relevante informatie gevonden in de documenten'
      });
    }
    
    console.log('✅ Assistants API processing completed');

    return NextResponse.json({
      success: true,
      data: {
        details,
        autofilled_fields: Object.keys(details)
      },
      message: `Employee information successfully extracted from ${sortedDocs.length} documents using Assistants API`
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
