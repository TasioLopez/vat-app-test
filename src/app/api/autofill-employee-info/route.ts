import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';
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
    if (!employeeId) {
      return new Response(JSON.stringify({ error: 'Ontbrekende employeeId' }), { status: 400 });
    }

    const { data: docs, error } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId);

    if (error || !docs?.length) {
      return new Response(JSON.stringify({ error: 'No documents found' }), { status: 404 });
    }

    const sections: string[] = [];

    for (const doc of docs) {
      if (!doc.url) continue;

      const path = extractStoragePath(doc.url);
      if (!path) {
        console.warn('⚠️ Skipped file with bad URL:', doc.url);
        continue;
      }

      const { data: file, error: downloadError } = await supabase.storage
        .from('documents')
        .download(path);

      if (!file || downloadError) {
        console.warn('⚠️ Kon bestand niet downloaden:', path);
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log('📦 Downloaded file buffer size:', buffer.length);

      const text = await extractTextFromPdf(buffer);
      if (!text?.trim()) continue;

      const withHeaders = addSectionHeaders(text.trim());
      sections.push(`== ${doc.type.toUpperCase()} ==\n${withHeaders}`);
    }

    if (!sections.length) {
      return new Response(
        JSON.stringify({ error: 'No readable content in uploaded documents' }),
        { status: 400 }
      );
    }

    const combined = sections.join('\n\n');
    const chunks = splitIntoChunks(combined);

    const systemPrompt = `
Je bent een assistent gespecialiseerd in het analyseren van Nederlandse AD-rapportages.
Gebruik alleen tekst uit de rapporten zelf — nooit aannames maken.

➡️ Haal alleen de volgende gegevens uit het rapport:
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

Zorg dat elk veld gebaseerd is op expliciete informatie uit het document.
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
              required: ['current_job', 'education_level']
            }
          }
        }
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'extract_employee_fields' }
      }
    });

    const args = response.choices[0]?.message?.tool_calls?.[0]?.function?.arguments;

    try {
      const details = JSON.parse(args || '{}');
      return new Response(
        JSON.stringify({ details, autofilled_fields: Object.keys(details) }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('❌ Kon assistent output niet verwerken:', err);
      return new Response(
        JSON.stringify({ error: 'Ongeldige assistent output' }),
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('❌ Unexpected server error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected server error', details: err.message }),
      { status: 500 }
    );
  }
}
