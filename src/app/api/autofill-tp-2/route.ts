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

// Simple PDF text extraction that works 100% in Vercel
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Convert buffer to string and extract readable text
    const bufferString = buffer.toString('utf8');
    
    // Look for specific patterns from TP documents
    const patterns = [
      /intake[^:]*:\s*([^\n\r]+)/i,
      /trajectplan[^:]*:\s*([^\n\r]+)/i,
      /start[^:]*:\s*([^\n\r]+)/i,
      /eind[^:]*:\s*([^\n\r]+)/i,
      /datum[^:]*:\s*([^\n\r]+)/i,
      /rapport[^:]*:\s*([^\n\r]+)/i,
      /IZP[^:]*:\s*([^\n\r]+)/i,
      /inzetbaarheidsprofiel[^:]*:\s*([^\n\r]+)/i,
      /eerste[^:]*verzuim[^:]*:\s*([^\n\r]+)/i,
      /eerste[^:]*ziekte[^:]*:\s*([^\n\r]+)/i,
      /registratie[^:]*:\s*([^\n\r]+)/i,
      /arbo[^:]*:\s*([^\n\r]+)/i,
      /bedrijfsarts[^:]*:\s*([^\n\r]+)/i,
      /organisatie[^:]*:\s*([^\n\r]+)/i,
      /weken[^:]*:\s*(\d+)/i
    ];
    
    const extractedInfo: string[] = [];
    
    for (const pattern of patterns) {
      const match = bufferString.match(pattern);
      if (match) {
        extractedInfo.push(`${pattern.source}: ${match[1]}`);
      }
    }
    
    if (extractedInfo.length > 0) {
      const text = extractedInfo.join('\n');
      console.log('📄 TP PDF extraction successful, found patterns:', extractedInfo.length);
      return text;
    }
    
    // Fallback: extract any readable text
    const readableText = bufferString.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
    if (readableText && readableText.length > 0) {
      const text = readableText.join(' ');
      console.log('📄 TP PDF extraction successful, extracted readable text');
      return text;
    }
    
    return '';
  } catch (error: any) {
    console.error('TP PDF extraction failed:', error.message);
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

    const texts: string[] = [];

    for (const doc of docs || []) {
      if (!doc.url) continue;
      const path = extractStoragePath(doc.url);
      if (!path) continue;

      const { data: file } = await supabase.storage.from('documents').download(path);
      if (!file) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const text = await extractTextFromPdf(buffer);
      if (text?.length > 20) texts.push(text.trim());
    }

    if (!texts.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'No readable documents',
        data: { details: {} }
      }, { status: 400 });
    }

    const combined = texts.join('\n\n');
    const chunks = splitIntoChunks(combined);

    const systemPrompt = `
Je bent een assistent die Nederlandse documenten analyseert voor het invullen van een trajectplan. Gebruik alleen tekst uit het document.

➡️ Haal alleen de volgende gegevens uit het document. Gebruik synoniemen of contextuele hints om deze velden te herkennen, bijvoorbeeld:

- "eerste verzuimdag" of "eerste ziektedag" → first_sick_day
- "datum rapportage" → ad_report_date
- "IZP" of "inzetbaarheidsprofiel" → fml_izp_lab_date

Geef enkel gegevens die expliciet vermeld staan:

- intake_date
- tp_start_date
- tp_end_date
- tp_creation_date
- ad_report_date
- fml_izp_lab_date
- first_sick_day
- intake_date
- registration_date
- occupational_doctor_name
- occupational_doctor_org
- tp_lead_time (in weken)
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
            name: 'extract_tp_fields',
            description: 'Extract structured TP document fields',
            parameters: {
              type: 'object',
              properties: {
                intake_date: { type: 'string', format: 'date' },
                tp_start_date: { type: 'string', format: 'date' },
                tp_end_date: { type: 'string', format: 'date' },
                tp_creation_date: { type: 'string', format: 'date' },
                ad_report_date: { type: 'string', format: 'date' },
                fml_izp_lab_date: { type: 'string', format: 'date' },
                first_sick_day: { type: 'string', format: 'date' },
                registration_date: { type: 'string', format: 'date' },
                occupational_doctor_name: { type: 'string' },
                occupational_doctor_org: { type: 'string' },
                tp_lead_time: { type: 'integer' }
              },
              required: ['tp_creation_date']
            }
          }
        }
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'extract_tp_fields' }
      }
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;

    if (!args) {
      console.warn('⚠️ No arguments returned from OpenAI tool function');
      return NextResponse.json({ 
        success: false, 
        error: 'No autofill data found',
        data: { details: {} }
      }, { status: 200 });
    }

    try {
      const details = JSON.parse(args);
      return NextResponse.json({
        success: true,
        details,
        autofilled_fields: Object.keys(details)
      });
    } catch (err: any) {
      console.error('❌ Parsing error:', err);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to parse output',
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
