import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { ChatCompletionMessageParam } from 'openai/resources';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function splitIntoChunks(text: string, maxLen = 4000): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > maxLen) {
      chunks.push(current.trim());
      current = line;
    } else {
      current += '\n' + line;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Enhanced PDF text extraction for TP documents
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Use pdfjs-dist for proper PDF parsing in Node.js environment
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // In Node.js/serverless environment, disable worker
    // @ts-ignore - GlobalWorkerOptions exists but types are incomplete
    if (pdfjs.GlobalWorkerOptions) {
      // @ts-ignore
      pdfjs.GlobalWorkerOptions.workerSrc = null;
    }

    const uint8Array = new Uint8Array(buffer);
    // @ts-ignore - getDocument types are incomplete
    const loadingTask = pdfjs.getDocument({ 
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('📄 TP PDF extraction successful, extracted', fullText.length, 'characters from', pdf.numPages, 'pages');
    return fullText;
  } catch (error: any) {
    console.error('⚠️ pdfjs extraction failed, trying fallback:', error.message);
    
    // Fallback: basic text extraction
    try {
      const bufferString = buffer.toString('latin1');
      
      // Extract text between common PDF text markers
      const textMatches = bufferString.match(/\(([^\)]{3,})\)/g);
      if (textMatches) {
        const extractedText = textMatches
          .map(match => match.slice(1, -1))
          .join(' ')
          .replace(/\\[rn]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (extractedText.length > 50) {
          console.log('📄 Fallback PDF extraction successful, extracted', extractedText.length, 'characters');
          return extractedText;
        }
      }
      
      // Last resort: look for readable ASCII text
      const readableText = bufferString.match(/[A-Za-z][A-Za-z0-9\s\-\.\,\:\;\(\)]{15,}/g);
      if (readableText && readableText.length > 0) {
        const text = readableText.join(' ');
        console.log('📄 Basic text extraction found', text.length, 'characters');
        return text;
      }
    } catch (fallbackError: any) {
      console.error('❌ All PDF extraction methods failed:', fallbackError.message);
    }
    
    return '';
  }
}

function extractStoragePath(url: string): string | null {
  const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (match?.[1]) return match[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
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

    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId);

    if (!docs || docs.length === 0) {
      console.log('⚠️ No documents found for employee:', employeeId);
      return NextResponse.json({ 
        success: false, 
        error: 'Geen documenten gevonden voor deze werknemer',
        data: { details: {} }
      }, { status: 200 });
    }

    console.log('📄 Found', docs.length, 'documents for employee:', employeeId);

    // Prioritize document types: Intakeformulier > AD Rapport > FML/IZP > Others
    const docPriority: Record<string, number> = {
      'intakeformulier': 1,
      'intake': 1,
      'ad rapport': 2,
      'ad-rapport': 2,
      'arbeidsdeskundig rapport': 2,
      'fml': 3,
      'izp': 3,
      'lab': 3,
      'inzetbaarheidsprofiel': 3,
      'overig': 4
    };

    const sortedDocs = docs.sort((a, b) => {
      const aType = (a.type || '').toLowerCase();
      const bType = (b.type || '').toLowerCase();
      const aPriority = docPriority[aType] || 5;
      const bPriority = docPriority[bType] || 5;
      return aPriority - bPriority;
    });

    const texts: string[] = [];

    for (const doc of sortedDocs) {
      if (!doc.url) {
        console.log('⚠️ Document has no URL:', doc.id);
        continue;
      }
      
      const path = extractStoragePath(doc.url);
      if (!path) {
        console.log('⚠️ Could not extract storage path from:', doc.url);
        continue;
      }

      console.log('📥 Downloading document:', doc.type, '-', doc.filename || doc.id);
      const { data: file, error: downloadError } = await supabase.storage.from('documents').download(path);
      
      if (downloadError || !file) {
        console.error('❌ Failed to download document:', downloadError?.message);
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      console.log('🔍 Extracting text from:', doc.filename || doc.id, '(', buffer.length, 'bytes)');
      
      const text = await extractTextFromPdf(buffer);
      
      if (text?.length > 20) {
        console.log('✅ Extracted', text.length, 'characters from:', doc.filename || doc.id);
        // Add document type label for context
        texts.push(`--- DOCUMENT TYPE: ${doc.type || 'Unknown'} | FILENAME: ${doc.filename || 'Unknown'} ---\n${text.trim()}`);
      } else {
        console.log('⚠️ No usable text extracted from:', doc.filename || doc.id);
      }
    }

    if (!texts.length) {
      console.log('❌ No readable text extracted from any documents');
      return NextResponse.json({ 
        success: false, 
        error: 'Geen leesbare tekst gevonden in documenten. Upload PDF documenten met tekst (geen gescande afbeeldingen).',
        data: { details: {} }
      }, { status: 200 });
    }

    console.log('📝 Total extracted text length:', texts.join('\n\n').length, 'characters');
    const combined = texts.join('\n\n--- NEXT DOCUMENT ---\n\n');
    const chunks = splitIntoChunks(combined, 6000); // Larger chunks for better context
    console.log('📦 Split into', chunks.length, 'chunks for AI processing');

    const systemPrompt = `
Je bent een assistent die Nederlandse documenten (Intakeformulier, AD Rapport, FML/IZP rapport) analyseert voor het invullen van een trajectplan STAP 2.

⚠️ BELANGRIJK: Extract ALLEEN de volgende velden die in documenten vermeld staan. Extract NIET de volgende velden (deze worden automatisch berekend):
- tp_creation_date (wordt in stap 1 ingevoerd)
- tp_start_date (wordt automatisch berekend)
- tp_end_date (wordt automatisch berekend)  
- tp_lead_time (wordt automatisch berekend)
- intake_date (wordt in stap 1 ingevoerd)

📋 Extract ALLEEN deze velden als ze expliciet in het document staan:

1. **first_sick_day** - Eerste ziektedag / Eerste verzuimdag
   Zoek naar: "Eerste ziektedag:", "Eerste verzuimdag:", "Datum eerste ziekmelding:", "1e ziektedag"
   
2. **registration_date** - Registratiedatum / Aanmelddatum UWV
   Zoek naar: "Registratiedatum:", "Datum registratie:", "Aanmelddatum", "Datum aanmelding UWV"
   
3. **ad_report_date** - Datum AD Rapport / Arbeidsdeskundig rapport
   Zoek naar: "Datum rapport:", "Datum AD rapport:", "Rapportdatum:", "Datum rapportage", hoofding rapport met datum
   
4. **fml_izp_lab_date** - Datum FML/IZP/LAB rapport
   Zoek naar: "Datum FML:", "Datum IZP:", "Datum LAB:", "Datum inzetbaarheidsprofiel:", "Datum Functionele Mogelijkheden Lijst"
   
5. **occupational_doctor_name** - Naam bedrijfsarts / Arbo-arts
   Zoek naar: "Bedrijfsarts:", "Arbo-arts:", "Arts:", naam bij arbo-organisatie
   
6. **occupational_doctor_org** - Organisatie bedrijfsarts / Arbodienst
   Zoek naar: "Arbodienst:", "Arbo-organisatie:", "Bedrijfsarts organisatie:", naam arbodienst

🎯 DOEL: Vind deze specifieke datums en namen in het document. Als een veld niet gevonden kan worden, laat het dan weg uit de output.

📅 DATUM FORMAAT: Gebruik altijd YYYY-MM-DD formaat (bijv. "2024-03-15" voor 15 maart 2024).

🔍 BELANGRIJKE TIPS:
- Kijk zorgvuldig door het hele document
- Let op verschillende benamingen (synoniemen) voor hetzelfde veld
- Gebruik context: bijvoorbeeld een datum bij "AD Rapport" is waarschijnlijk ad_report_date
- Als er meerdere datums zijn, kies de meest relevante/recente
    `.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...chunks.map((chunk) => ({ role: 'user', content: chunk })) as ChatCompletionMessageParam[]
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_tp_step2_fields',
            description: 'Extract ONLY Step 2 TP document fields (NOT auto-calculated fields like tp_creation_date, tp_start_date, tp_end_date, tp_lead_time, intake_date)',
            parameters: {
              type: 'object',
              properties: {
                first_sick_day: { 
                  type: 'string', 
                  format: 'date',
                  description: 'Eerste ziektedag/verzuimdag (YYYY-MM-DD format)'
                },
                registration_date: { 
                  type: 'string', 
                  format: 'date',
                  description: 'Registratiedatum/Aanmelddatum UWV (YYYY-MM-DD format)'
                },
                ad_report_date: { 
                  type: 'string', 
                  format: 'date',
                  description: 'Datum AD Rapport/Arbeidsdeskundig rapport (YYYY-MM-DD format)'
                },
                fml_izp_lab_date: { 
                  type: 'string', 
                  format: 'date',
                  description: 'Datum FML/IZP/LAB rapport (YYYY-MM-DD format)'
                },
                occupational_doctor_name: { 
                  type: 'string',
                  description: 'Naam bedrijfsarts/Arbo-arts'
                },
                occupational_doctor_org: { 
                  type: 'string',
                  description: 'Organisatie bedrijfsarts/Arbodienst'
                }
              },
              required: []
            }
          }
        }
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'extract_tp_step2_fields' }
      }
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;

    if (!args) {
      console.warn('⚠️ No arguments returned from OpenAI tool function');
      return NextResponse.json({ 
        success: false, 
        error: 'Geen autofill gegevens gevonden in de documenten',
        data: { details: {} }
      }, { status: 200 });
    }

    try {
      const details = JSON.parse(args);
      const fieldCount = Object.keys(details).length;
      
      console.log('✅ Successfully extracted', fieldCount, 'fields:', Object.keys(details).join(', '));
      console.log('📋 Extracted values:', JSON.stringify(details, null, 2));
      
      if (fieldCount === 0) {
        console.warn('⚠️ AI returned empty object - no fields found');
        return NextResponse.json({ 
          success: false, 
          error: 'Geen relevante informatie gevonden in de documenten',
          data: { details: {} }
        }, { status: 200 });
      }
      
      return NextResponse.json({
        success: true,
        details,
        autofilled_fields: Object.keys(details),
        message: `${fieldCount} velden succesvol ingevuld`
      });
    } catch (err: any) {
      console.error('❌ JSON parsing error:', err.message);
      console.error('Raw args:', args);
      return NextResponse.json({ 
        success: false, 
        error: 'Fout bij verwerken van AI output',
        data: { details: {} }
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('❌ Server error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error', 
      details: err.message,
      data: { details: {} }
    }, { status: 500 });
  }
}
