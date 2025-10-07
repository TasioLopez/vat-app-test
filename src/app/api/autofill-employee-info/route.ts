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

    // TEMPORARY: Skip document processing and return mock data for testing
    console.log('🧪 Using mock data for testing - found', docs.length, 'documents');
    
    const mockDetails = {
      current_job: 'Test Job from Documents',
      work_experience: 'Test work experience extracted from documents',
      education_level: 'MBO',
      drivers_license: true,
      has_transport: true,
      dutch_speaking: true,
      dutch_writing: true,
      dutch_reading: true,
      has_computer: true,
      computer_skills: 3,
      contract_hours: 40,
      other_employers: 'None found in documents'
    };

    return createSuccessResponse(
      { 
        details: mockDetails, 
        autofilled_fields: Object.keys(mockDetails) 
      },
      'Mock employee information generated from document analysis'
    );
  } catch (error: any) {
    return handleAPIError(error);
  }
}
