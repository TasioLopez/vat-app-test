import { NextRequest } from 'next/server';
import { handleAPIError, createSuccessResponse, validateRequiredFields, validateUUID } from '@/lib/api-utils';
import { OpenAIService } from '@/lib/openai-service';
import { SupabaseService } from '@/lib/supabase-service';
import pdf from 'pdf-parse';
// import mammoth from 'mammoth'; // Temporarily disabled
import type { ChatCompletionMessageParam } from 'openai/resources';

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

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    if (data.text && data.text.trim().length > 20) {
      console.log('✅ Extracted text directly from PDF.');
      return data.text;
    } else {
      console.warn('⚠️ Extracted text was too short.');
      return '';
    }
  } catch (err) {
    console.error('❌ PDF text extraction failed:', err);
    return '';
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    console.warn('⚠️ DOCX processing temporarily disabled');
    return '';
  } catch (err) {
    console.error('❌ DOCX text extraction failed:', err);
    return '';
  }
}

async function extractTextFromDocument(buffer: Buffer, fileName: string): Promise<string> {
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.endsWith('.pdf')) {
    return await extractTextFromPdf(buffer);
  } else if (lowerFileName.endsWith('.docx') || lowerFileName.endsWith('.doc')) {
    return await extractTextFromDocx(buffer);
  } else {
    console.warn('⚠️ Unsupported file type:', fileName);
    return '';
  }
}

function addSectionHeaders(raw: string): string {
  const headers = [
    'Persoonsgegevens', 'Voorgeschiedenis', 'Opleiding', 'Werkervaring',
    'Huidige situatie', 'Inzetmogelijkheden', 'Capaciteiten',
    'Beperkingen', 'Conclusie', 'Advies'
  ];

  let output = raw;
  for (const h of headers) {
    const regex = new RegExp(`(?<=\\n|^)(${h})(?=\\n|:|\\s)`, 'gi');
    output = output.replace(regex, `\n\n== ${h.toUpperCase()} ==\n`);
  }
  return output;
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
    
    // Validate input
    validateRequiredFields({ employeeId }, ['employeeId']);
    validateUUID(employeeId!, 'Employee ID');

    const supabaseService = SupabaseService.getInstance();
    const supabase = supabaseService.getClient();

    const { data: docs, error } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId!);

    if (error || !docs?.length) {
      return createSuccessResponse(
        { details: {} },
        'No documents found for this employee'
      );
    }

    // Define document priority order
    const docPriority = {
      'intakeformulier': 1,
      'ad rapport': 2,
      'fml/izp': 3,
      'overig': 4
    };

    // Sort documents by priority
    const sortedDocs = docs.sort((a, b) => {
      const aType = (a.type || '').toLowerCase();
      const bType = (b.type || '').toLowerCase();
      const aPriority = docPriority[aType as keyof typeof docPriority] || 999;
      const bPriority = docPriority[bType as keyof typeof docPriority] || 999;
      return aPriority - bPriority;
    });

    const sections: string[] = [];

    for (const doc of sortedDocs) {
      try {
        if (!doc.url) {
          console.warn('⚠️ Document has no URL:', doc.id);
          continue;
        }

        const path = extractStoragePath(doc.url);
        if (!path) {
          console.warn('⚠️ Skipped file with bad URL:', doc.url);
          continue;
        }

        const { data: file, error: downloadError } = await supabase.storage
          .from('documents')
          .download(path);

        if (!file || downloadError) {
          console.warn('⚠️ Kon bestand niet downloaden:', path, downloadError?.message);
          continue;
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('📦 Downloaded file buffer size:', buffer.length);

        const text = await extractTextFromDocument(buffer, doc.name || '');
        if (!text?.trim()) {
          console.warn('⚠️ No text extracted from document:', doc.name);
          continue;
        }

        const withHeaders = addSectionHeaders(text.trim());
        const docType = doc.type || 'UNKNOWN';
        sections.push(`== ${docType.toUpperCase()} ==\n${withHeaders}`);
        console.log('✅ Successfully processed document:', doc.name, 'Type:', docType);
      } catch (docError) {
        console.error('❌ Error processing document:', doc.name, docError);
        continue; // Continue with next document
      }
    }

    if (!sections.length) {
      // If no documents could be processed, return a helpful message
      return createSuccessResponse(
        { details: {} },
        'No readable content found in uploaded documents. Please ensure documents are in PDF or DOCX format and contain sufficient text.'
      );
    }

    const combined = sections.join('\n\n');
    const chunks = splitIntoChunks(combined);

    const systemPrompt = `
Je bent een assistent gespecialiseerd in het analyseren van Nederlandse werknemersdocumenten.
Gebruik alleen tekst uit de documenten zelf — nooit aannames maken.

BELANGRIJKE PRIORITEIT: Documenten zijn gesorteerd op prioriteit:
1. INTAKEFORMULIER (hoogste prioriteit - gebruik deze informatie als er conflicten zijn)
2. AD RAPPORT (tweede prioriteit)
3. FML/IZP (derde prioriteit)
4. OVERIG (laagste prioriteit)

➡️ Haal alleen de volgende gegevens uit de documenten:
- Beroep of functie van de werknemer
- Relevante werkervaring
- Opleidingsniveau (Kies slechts één van de volgende: Praktijkonderwijs, VMBO, HAVO, VWO, MBO, HBO, WO)
- Rijbewijs (ja/nee)
- Vervoer beschikbaar (auto/fiets)
- Computervaardigheden (Kies slechts één van de volgende: 1 - Geen, 2 - Basis (e-mail, browsen), 3 - Gemiddeld (Word, Excel), 4 - Gevorderd (meerdere programma's), 5 - Expert (IT-gerelateerde vaardigheden))
- Contracturen
- Andere werkgevers indien vermeld
- Taalvaardigheid Nederlands (spreken/schrijven/lezen)
- Heeft de werknemer een computer thuis?

REGEL: Bij conflicterende informatie tussen documenten, geef ALTIJD voorrang aan informatie uit het INTAKEFORMULIER.
`.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...chunks.map((chunk) => ({ role: 'user', content: chunk })) as ChatCompletionMessageParam[]
    ];

    const openaiService = OpenAIService.getInstance();
    
    const toolSchema = {
      type: "function" as const,
      function: {
        name: "extract_employee_fields",
        description: "Extract structured employee profile fields",
        parameters: {
          type: "object" as const,
          properties: {
            current_job: { type: "string" as const },
            work_experience: { type: "string" as const },
            education_level: { type: "string" as const },
            drivers_license: { type: "boolean" as const },
            has_transport: { type: "boolean" as const },
            dutch_speaking: { type: "boolean" as const },
            dutch_writing: { type: "boolean" as const },
            dutch_reading: { type: "boolean" as const },
            has_computer: { type: "boolean" as const },
            computer_skills: { type: "integer" as const, minimum: 1, maximum: 5 },
            contract_hours: { type: "integer" as const },
            other_employers: { type: "string" as const }
          },
          required: ["current_job", "education_level"]
        }
      }
    };

    let result;
    try {
      console.log('🤖 Starting OpenAI processing with', chunks.length, 'chunks');
      result = await openaiService.generateContent(
        systemPrompt,
        chunks.join('\n\n'),
        toolSchema,
        { temperature: 0, maxTokens: 4000 }
      );
      console.log('✅ OpenAI processing completed successfully');
    } catch (openaiError) {
      console.error('❌ OpenAI generation failed:', openaiError);
      return createSuccessResponse(
        { details: {} },
        'AI processing failed. Please try again or contact support.'
      );
    }

    if (!result) {
      console.warn('⚠️ OpenAI returned empty result');
      return createSuccessResponse(
        { details: {} },
        'Failed to generate content from documents'
      );
    }

    return createSuccessResponse(
      { 
        details: result, 
        autofilled_fields: Object.keys(result) 
      },
      'Employee information successfully extracted'
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
