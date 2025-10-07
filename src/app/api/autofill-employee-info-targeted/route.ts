import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Document priority order
const DOCUMENT_PRIORITY = {
  'intakeformulier': 1,
  'ad rapport': 2,
  'fml/izp': 3,
  'overig': 4
};

// Helper function to extract storage path from URL
function extractStoragePath(url: string): string | null {
  const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (match?.[1]) return match[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
}

// Enhanced PDF text extraction with multiple fallback methods
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Method 1: Try pdf-parse
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    if (data.text && data.text.trim().length > 10) {
      console.log('✅ PDF-parse successful, text length:', data.text.length);
      return data.text;
    }
  } catch (error: any) {
    console.log('⚠️ PDF-parse failed:', error.message);
  }

  try {
    // Method 2: Try raw buffer analysis
    const rawText = buffer.toString('utf8');
    const textMatches = rawText.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
    if (textMatches && textMatches.length > 0) {
      const extractedText = textMatches.join(' ');
      console.log('✅ Raw buffer extraction successful, text length:', extractedText.length);
      return extractedText;
    }
  } catch (error: any) {
    console.log('⚠️ Raw buffer extraction failed:', error.message);
  }

  try {
    // Method 3: Try binary analysis
    const binaryText = buffer.toString('binary');
    const textMatches = binaryText.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
    if (textMatches && textMatches.length > 0) {
      const extractedText = textMatches.join(' ');
      console.log('✅ Binary extraction successful, text length:', extractedText.length);
      return extractedText;
    }
  } catch (error: any) {
    console.log('⚠️ Binary extraction failed:', error.message);
  }

  // Method 4: Manual pattern extraction for your specific document
  try {
    const rawText = buffer.toString('utf8');
    
    // Look for specific patterns from your intakeformulier
    const patterns = [
      /Naam werknemer:\s*([^\n\r]+)/i,
      /Gespreksdatum:\s*([^\n\r]+)/i,
      /Leeftijd werknemer:\s*(\d+)/i,
      /Geslacht werknemer:\s*([^\n\r]+)/i,
      /Functietitel:\s*([^\n\r]+)/i,
      /Werkgever\/organisatie:\s*([^\n\r]+)/i,
      /Urenomvang functie[^:]*:\s*(\d+)/i
    ];

    const extractedInfo = [];
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match) {
        extractedInfo.push(match[0]);
      }
    }

    if (extractedInfo.length > 0) {
      const extractedText = extractedInfo.join('\n');
      console.log('✅ Pattern extraction successful, found patterns:', extractedInfo.length);
      return extractedText;
    }
  } catch (error: any) {
    console.log('⚠️ Pattern extraction failed:', error.message);
  }

  console.log('❌ All extraction methods failed');
  return '';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    console.log('🔍 Processing employee:', employeeId);

    // Fetch documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('Database error:', docsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
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

    // Process documents and extract text
    const documentTexts: string[] = [];
    let processedCount = 0;
    
    for (const doc of sortedDocs) {
      try {
        if (!doc.url) continue;

        const path = extractStoragePath(doc.url);
        if (!path) continue;

        console.log('📥 Processing document:', doc.name, 'Type:', doc.type);

        const { data: file, error: downloadError } = await supabase.storage
          .from('documents')
          .download(path);

        if (!file || downloadError) {
          console.warn('Download failed:', doc.name);
          continue;
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text from PDF
        const text = await extractTextFromPdf(buffer);
        console.log('📄 Extracted text length:', text.length, 'from', doc.name);
        
        if (text && text.trim().length > 10) {
          const docType = doc.type || 'UNKNOWN';
          documentTexts.push(`=== ${docType.toUpperCase()} ===\n${text.trim()}`);
          processedCount++;
          console.log('✅ Successfully processed:', doc.name, 'Type:', docType);
          console.log('📄 Text preview:', text.substring(0, 300) + '...');
        } else {
          console.warn('⚠️ No text extracted from:', doc.name);
        }
      } catch (error: any) {
        console.error('Error processing document:', doc.name, error);
        continue;
      }
    }

    if (documentTexts.length === 0) {
      console.error('❌ No documents could be processed - PDF extraction failed');
      return NextResponse.json({ 
        success: false, 
        data: { details: {} },
        message: 'Failed to extract text from PDF documents. Please ensure documents are valid PDFs.'
      });
    }

    console.log('🤖 Processing with AI...');

    // Process with AI using OpenAI API directly
    const combinedText = documentTexts.join('\n\n');
    console.log('📄 Combined text length:', combinedText.length);
    console.log('📄 First 500 characters:', combinedText.substring(0, 500));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `Je bent een assistent gespecialiseerd in het analyseren van Nederlandse werknemersdocumenten.
Gebruik ALLEEN informatie uit de documenten zelf - geen aannames maken.

BELANGRIJKE PRIORITEIT: Documenten zijn gesorteerd op prioriteit:
1. INTAKEFORMULIER (hoogste prioriteit - gebruik deze informatie bij conflicten)
2. AD RAPPORT (tweede prioriteit)
3. FML/IZP (derde prioriteit)
4. OVERIG (laagste prioriteit)

BELANGRIJK: Je MOET alle velden invullen met EXACTE informatie uit de documenten.

Zoek specifiek naar deze informatie in de documenten:
- Naam werknemer, Gespreksdatum, Leeftijd werknemer, Geslacht werknemer
- Functietitel (current_job) - VERPLICHT, zoek naar "Functietitel:" of "Functie:"
- Werkgever/organisatie (other_employers) - VERPLICHT, zoek naar "Werkgever/organisatie:" of "Organisatie:"
- Urenomvang functie (contract_hours) - VERPLICHT, zoek naar "Urenomvang functie" of "Contracturen"
- Relevante werkervaring (work_experience) - VERPLICHT, beschrijf alle relevante werkervaring
- Opleidingsniveau (education_level) - VERPLICHT, kies uit: Praktijkonderwijs, VMBO, HAVO, VWO, MBO, HBO, WO
- Rijbewijs (drivers_license) - true/false
- Vervoer beschikbaar (has_transport) - true/false
- Computervaardigheden (computer_skills) - 1-5: 1=Geen, 2=Basis, 3=Gemiddeld, 4=Gevorderd, 5=Expert
- Taalvaardigheid Nederlands (dutch_speaking, dutch_writing, dutch_reading) - true/false
- Heeft de werknemer een computer thuis? (has_computer) - true/false

Bij conflicterende informatie, geef ALTIJD voorrang aan het INTAKEFORMULIER.`
          },
          {
            role: 'user',
            content: combinedText
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_employee_fields',
            description: 'Extract structured employee profile fields',
            parameters: {
              type: 'object',
              properties: {
                current_job: { type: 'string' },
                work_experience: { type: 'string' },
                education_level: { type: 'string' },
                drivers_license: { type: 'boolean' },
                has_transport: { type: 'boolean' },
                dutch_speaking: { type: 'boolean' },
                dutch_writing: { type: 'boolean' },
                dutch_reading: { type: 'boolean' },
                has_computer: { type: 'boolean' },
                computer_skills: { type: 'integer', minimum: 1, maximum: 5 },
                contract_hours: { type: 'integer' },
                other_employers: { type: 'string' }
              },
              required: ['current_job', 'education_level', 'work_experience', 'other_employers', 'contract_hours']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_employee_fields' } }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const completion = await response.json();
    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No valid response from AI');
    }

    const details = JSON.parse(toolCall.function.arguments);
    console.log('✅ AI processing completed');
    console.log('📄 Extracted details:', details);

    return NextResponse.json({
      success: true,
      data: {
        details,
        autofilled_fields: Object.keys(details)
      },
      message: `Employee information successfully extracted from ${processedCount} documents using AI`
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      error: 'Processing failed', 
      details: error.message 
    }, { status: 500 });
  }
}
