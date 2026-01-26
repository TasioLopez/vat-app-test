import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function extractStoragePath(url: string): string | null {
  const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (match?.[1]) return match[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
}

// NEW APPROACH: OpenAI Assistants API for document processing
async function processDocumentsWithAssistant(docs: any[]): Promise<any> {
  console.log('🚀 Using OpenAI Assistants API for document processing...');
  
  try {
    // Step 1: Create assistant with instructions
    const assistant = await openai.beta.assistants.create({
      name: "Trajectplan Document Analyzer",
      instructions: `Je bent een expert in het analyseren van Nederlandse re-integratie documenten.

BELANGRIJK: Extract ALLEEN TP metadata velden (trajectplan-specifieke velden). 
NIET extracten: employee profile velden zoals current_job, work_experience, education_level, transport_type, dutch_speaking/writing/reading, computer_skills, etc. 
Deze velden horen in het werknemersprofiel, niet in TP metadata.

Extract ALLEEN deze TP metadata velden als je ze vindt:
1. first_sick_day: "Datum ziekmelding:" (YYYY-MM-DD format)
2. registration_date: "Aanmeld:" (YYYY-MM-DD format)
3. intake_date: "Gespreksdatum:" (YYYY-MM-DD format)
4. ad_report_date: "Datum rapport:" (YYYY-MM-DD format)
5. fml_izp_lab_date: "Datum FML:" or "Datum FML/IZP/LAB:" (YYYY-MM-DD format)
6. occupational_doctor_name: "Arbeidsdeskundige:" - Extract name AND company in format "Name, Company"
7. occupational_doctor_org: "Bedrijfsarts:" - Extract name and supervision info. VERWIJDER: BIG nummers en "- Bedrijfsarts" suffix (overbodig).

Voorbeelden:
- "Datum ziekmelding: 26-04-2024" → first_sick_day: "2024-04-26"
- "Aanmeld: 12-06-2025" → registration_date: "2025-06-12"
- "Arbeidsdeskundige: Marc Arendsen van Buro werk wijzer" → occupational_doctor_name: "Marc Arendsen, Buro werk wijzer"
- "Bedrijfsarts: Arts L. Bollen werkend onder supervisie van arts T. de Haas - BIG nr. 12345678901 - Bedrijfsarts" → occupational_doctor_org: "Arts L. Bollen, werkend onder supervisie van: arts T. de Haas"
- "Arts L Heydanus, Werkend onder supervisie van: M.E. Lindeboom - BIG nr. 39045796801 - Bedrijfsarts" → occupational_doctor_org: "Arts L Heydanus, Werkend onder supervisie van: M.E. Lindeboom"
- "Dr. Smith" → occupational_doctor_org: "Dr. Smith"

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
        content: "Analyseer deze documenten en extract de trajectplan velden.",
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
        
        // Post-process: Clean up occupational_doctor_org (remove BIG numbers and "- Bedrijfsarts" suffix)
        if (extractedData.occupational_doctor_org) {
          let cleaned = extractedData.occupational_doctor_org;
          // Remove BIG number pattern: " - BIG nr. XXXXXXXXXXX" or similar
          cleaned = cleaned.replace(/\s*-?\s*BIG\s*(nr\.?|nummer)?\s*[\d\s]+/gi, '');
          // Remove trailing "- Bedrijfsarts" or " Bedrijfsarts"
          cleaned = cleaned.replace(/\s*-?\s*Bedrijfsarts\s*$/i, '');
          // Clean up any double spaces or trailing punctuation
          cleaned = cleaned.replace(/\s+/g, ' ').trim();
          cleaned = cleaned.replace(/[,\-]\s*$/, '').trim();
          extractedData.occupational_doctor_org = cleaned;
          console.log('🧹 Cleaned occupational_doctor_org:', cleaned);
        }
        
        // Cleanup
        await openai.beta.assistants.delete(assistant.id);
        for (const fileId of fileIds) {
          await openai.files.delete(fileId);
        }
        console.log('✅ Cleaned up assistant and files');
        
        return extractedData;
      }
    }

    throw new Error(`Assistant run failed: ${run.status}`);
  } catch (error: any) {
    console.error('❌ Assistants API error:', error.message);
    return {};
  }
}

export async function GET(req: NextRequest) {
  console.log('🚀 Starting autofill-tp-2 request with Assistants API');
  
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const testMode = searchParams.get('test') === 'true';
    
    console.log('📋 Request params:', { employeeId, testMode });

    if (!employeeId) {
      console.log('❌ Missing employeeId');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing employeeId',
        data: { details: {} }
      }, { status: 400 });
    }

    if (testMode) {
      console.log('🧪 Test mode enabled for employee:', employeeId);
      return NextResponse.json({
        success: true,
        details: {
          first_sick_day: '2024-01-15',
          registration_date: '2024-01-20',
          ad_report_date: '2024-02-01',
          occupational_doctor_name: 'Dr. Test Arts',
          occupational_doctor_org: 'Test Arbodienst',
          intake_date: '2024-01-10',
          has_ad_report: true
        },
        autofilled_fields: ['first_sick_day', 'registration_date', 'ad_report_date', 'occupational_doctor_name', 'occupational_doctor_org', 'intake_date', 'has_ad_report'],
        message: 'Test data returned (7 velden)'
      });
    }

    console.log('🔍 Starting document processing for employee:', employeeId);

    // Fetch documents from database
    console.log('🔍 Querying documents from database...');
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, type, url, uploaded_at')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('❌ Database error fetching documents:', docsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error fetching documents', 
        details: docsError.message,
        data: { details: {} }
      }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      console.log('⚠️ No documents found for employee:', employeeId);
      return NextResponse.json({ 
        success: false, 
        error: 'Geen documenten gevonden voor deze werknemer.',
        data: { details: {} }
      }, { status: 200 });
    }

    console.log(`✅ Found ${docs.length} documents. Types:`, docs.map(d => d.type));

    // Define document priority for sorting
    const docPriority: { [key: string]: number } = {
      'intakeformulier': 1,
      'ad_rapportage': 2,
      'fml': 3,
      'izp': 3,
      'lab': 3,
      'extra': 4,
    };

    // Sort documents by priority: Intakeformulier > AD Rapport > FML/IZP
    const sortedDocs = docs.sort((a, b) => {
      const aType = (a.type || '').toLowerCase();
      const bType = (b.type || '').toLowerCase();
      const aPriority = docPriority[aType] || 5;
      const bPriority = docPriority[bType] || 5;
      return aPriority - bPriority;
    });

    console.log('📋 Sorted documents by priority:', sortedDocs.map(d => d.type));

    // Process documents with Assistants API
    const extractedData = await processDocumentsWithAssistant(sortedDocs);
    
    if (Object.keys(extractedData).length === 0) {
      console.log('❌ No data extracted from documents');
      return NextResponse.json({ 
        success: false, 
        error: 'Geen relevante informatie gevonden in de documenten',
        data: { details: {} }
      }, { status: 200 });
    }

    // Add has_ad_report if we have AD documents
    const hasADDoc = sortedDocs.some(doc => doc.type?.toLowerCase().includes('ad'));
    if (hasADDoc) {
      extractedData.has_ad_report = true;
    }

    console.log('✅ Final extracted data:', extractedData);
    console.log(`✅ Extracted ${Object.keys(extractedData).length} fields`);

    return NextResponse.json({
      success: true,
      details: extractedData,
      autofilled_fields: Object.keys(extractedData),
      message: `Assistants API gevonden in ${sortedDocs.length} documenten - ${Object.keys(extractedData).length} velden ingevuld`
    });

  } catch (err: any) {
    console.error('❌ Server error:', err);
    console.error('❌ Stack trace:', err.stack);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error bij autofill', 
      details: err.message,
      data: { details: {} }
    }, { status: 500 });
  }
}