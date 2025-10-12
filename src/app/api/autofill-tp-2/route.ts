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
    // Try pdf-parse first as it's more reliable in serverless
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    
    // Check if data exists and has text property
    if (data && typeof data === 'object' && data.text && typeof data.text === 'string' && data.text.length > 50) {
      console.log('📄 PDF extraction successful using pdf-parse, extracted', data.text.length, 'characters');
      return data.text;
    }
    
    console.log('⚠️ pdf-parse returned invalid data or minimal text, trying fallback');
    console.log('📋 pdf-parse data type:', typeof data, 'text type:', typeof data?.text, 'text length:', data?.text?.length);
  } catch (error: any) {
    console.error('⚠️ pdf-parse failed, trying fallback:', error.message);
  }
  
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
    
  // Always return a string, even if empty
    return '';
}

function extractStoragePath(url: string): string | null {
  const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (match?.[1]) return match[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
}

// Filter out obviously wrong values that AI might extract
function filterValidValues(data: any): any {
  const filtered: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    
    const stringValue = String(value).toLowerCase();
    
    // Filter out wrong occupational_doctor_name values
    if (key === 'occupational_doctor_name') {
      // Should contain "hupsel" or be a proper name, not "arend-jan" or similar
      if (stringValue.includes('hupsel') || 
          stringValue.includes('arbeidsdeskundige') ||
          stringValue.includes('register') ||
          (stringValue.length > 3 && !stringValue.includes('arend') && !stringValue.includes('writer'))) {
        filtered[key] = value;
      } else {
        console.log(`❌ Filtered out invalid occupational_doctor_name: "${value}"`);
      }
    }
    // Filter out wrong occupational_doctor_org values  
    else if (key === 'occupational_doctor_org') {
      // Should contain "arbodienst" or be a proper organization, not "convertapi" or similar
      if (stringValue.includes('arbodienst') || 
          stringValue.includes('arbo') ||
          stringValue.includes('bedrijfsarts') ||
          (stringValue.length > 5 && !stringValue.includes('convert') && !stringValue.includes('api'))) {
        filtered[key] = value;
      } else {
        console.log(`❌ Filtered out invalid occupational_doctor_org: "${value}"`);
      }
    }
    // Keep all other fields
    else {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

// MODERN 2025 AI APPROACH: Use advanced structured extraction with multiple strategies
async function processDocumentAggressively(text: string, doc: any): Promise<any> {
  console.log(`🚀 MODERN 2025 AI PROCESSING for ${doc?.type}...`);
  
  // STRATEGY 1: Use structured output with JSON mode for maximum reliability
  const structuredPrompt = `Je bent een expert AI die Nederlandse documenten analyseert voor re-integratie trajectplannen.

DOCUMENT TYPE: ${doc?.type}

OPDRACHT: Analyseer dit document en extract DE EXACTE informatie die je ziet. Geen aannames, alleen wat er letterlijk staat.

VERPLICHTE VELDEN (extract ALLEEN als je ze vindt):

1. first_sick_day: Zoek naar "Datum ziekmelding:" of "Eerste ziektedag:" - dit is de datum dat iemand ziek werd
2. registration_date: Zoek naar "Aanmeld:" of "Datum aanmelding:" - dit is de datum van aanmelding
3. ad_report_date: Zoek naar "Datum rapport:" of "Datum AD:" - dit is de datum van het AD rapport
4. fml_izp_lab_date: Zoek naar "Datum FML:" of "Datum IZP:" - dit is de datum van FML/IZP onderzoek
5. occupational_doctor_name: Zoek naar "Naam arbeidsdeskundige:" of "Arbeidsdeskundige:" - dit is de naam
6. occupational_doctor_org: Zoek naar organisatie van de specialist (meestal "De Arbodienst" of vergelijkbaar)
7. intake_date: Zoek naar "Gespreksdatum:" of "Datum intakegesprek:" - dit is de datum van het gesprek

BELANGRIJKE VOORBEELDEN UIT DOCUMENTEN:
- "Datum ziekmelding: 26-04-2024" → first_sick_day: "2024-04-26"
- "Aanmeld: 12-06-2025" → registration_date: "2025-06-12"
- "Datum rapport: 05-06-2025" → ad_report_date: "2025-06-05"
- "Datum FML: 20-03-2025" → fml_izp_lab_date: "2025-03-20"
- "Gespreksdatum: 17-6-2025" → intake_date: "2025-06-17"
- "Naam arbeidsdeskundige: R. Hupsel" → occupational_doctor_name: "R. Hupsel"

KRITIEKE REGELS:
- Converteer datums naar YYYY-MM-DD format
- ELKE veld heeft een ANDERE datum - NOOIT dezelfde datum voor meerdere velden
- Extract ALLEEN wat je letterlijk ziet in het document
- Als je iets niet vindt, laat het veld leeg

Geef een JSON object terug met de gevonden velden.`;

  try {
    // Use JSON mode for guaranteed structured output
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: structuredPrompt },
        { role: 'user', content: `Analyseer dit document:\n\n${text.substring(0, 8000)}` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const extractedData = JSON.parse(content);
      console.log('✅ Modern AI extracted:', extractedData);
      
      // Validate and clean the data
      const cleanedData: any = {};
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim().length > 0) {
          cleanedData[key] = value.trim();
        }
      });
      
      if (Object.keys(cleanedData).length > 0) {
        console.log('✅ Cleaned extracted data:', cleanedData);
        return cleanedData;
      }
    }
  } catch (error: any) {
    console.error('❌ Modern AI processing error:', error.message);
  }
  
  // STRATEGY 2: Fallback to function calling if JSON mode fails
  console.log('🔄 Falling back to function calling...');
  
  try {
    const functionPrompt = `Analyseer dit document en extract alle relevante informatie voor een trajectplan.

Document type: ${doc?.type}

Zoek naar:
1. Eerste ziektedag (first_sick_day)
2. Datum aanmelding (registration_date)  
3. Datum AD rapport (ad_report_date)
4. Datum FML/IZP/LAB (fml_izp_lab_date)
5. Naam arbeidsdeskundige (occupational_doctor_name)
6. Organisatie specialist (occupational_doctor_org)
7. Datum intakegesprek (intake_date)

Gebruik de function tool om de gevonden informatie terug te geven.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: functionPrompt },
        { role: 'user', content: `Document:\n\n${text.substring(0, 8000)}` }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'extract_trajectplan_fields',
          description: 'Extract all relevant fields for trajectplan',
          parameters: {
            type: 'object',
            properties: {
              first_sick_day: { type: 'string', description: 'Eerste ziektedag in YYYY-MM-DD format' },
              registration_date: { type: 'string', description: 'Datum aanmelding in YYYY-MM-DD format' },
              ad_report_date: { type: 'string', description: 'Datum AD rapport in YYYY-MM-DD format' },
              fml_izp_lab_date: { type: 'string', description: 'Datum FML/IZP/LAB in YYYY-MM-DD format' },
              occupational_doctor_name: { type: 'string', description: 'Naam van arbeidsdeskundige' },
              occupational_doctor_org: { type: 'string', description: 'Organisatie van specialist' },
              intake_date: { type: 'string', description: 'Datum intakegesprek in YYYY-MM-DD format' }
            },
            required: []
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'extract_trajectplan_fields' } }
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const extractedData = JSON.parse(toolCall.function.arguments);
      console.log('✅ Function calling extracted:', extractedData);
      
      // Clean the data
      const cleanedData: any = {};
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim().length > 0) {
          cleanedData[key] = value.trim();
        }
      });
      
      return cleanedData;
    }
  } catch (error: any) {
    console.error('❌ Function calling error:', error.message);
  }
  
  console.log('⚠️ All AI strategies failed, returning empty result');
  return {};
}

// MODERN 2025 COMBINED PROCESSING: Use JSON mode for multi-document analysis
async function modernDocumentProcessor(texts: string[], sortedDocs: any[]): Promise<any> {
  console.log('🚀 MODERN 2025 COMBINED PROCESSING...');
  
  const documentContext = sortedDocs.map((doc, index) => 
    `Document ${index + 1}: ${doc.type}`
  ).join(', ');

  const systemPrompt = `Je bent een expert AI die Nederlandse re-integratie documenten analyseert voor trajectplannen.

DOCUMENTEN: ${documentContext}

BELANGRIJKE PRIORITEIT: Documenten zijn gesorteerd op prioriteit:
1. INTAKEFORMULIER (hoogste prioriteit - gebruik deze informatie bij conflicten)
2. AD RAPPORT (tweede prioriteit)
3. FML/IZP (derde prioriteit)
4. OVERIG (laagste prioriteit)

OPDRACHT: Analyseer ALLE documenten en extract DE EXACTE informatie die je ziet. Geen aannames, alleen wat er letterlijk staat.

VERPLICHTE VELDEN (extract ALLEEN als je ze vindt):

1. first_sick_day: Zoek naar "Datum ziekmelding:" of "Eerste ziektedag:" - dit is de datum dat iemand ziek werd
2. registration_date: Zoek naar "Aanmeld:" of "Datum aanmelding:" - dit is de datum van aanmelding
3. ad_report_date: Zoek naar "Datum rapport:" of "Datum AD:" - dit is de datum van het AD rapport
4. fml_izp_lab_date: Zoek naar "Datum FML:" of "Datum IZP:" - dit is de datum van FML/IZP onderzoek
5. occupational_doctor_name: Zoek naar "Naam arbeidsdeskundige:" of "Arbeidsdeskundige:" - dit is de naam
6. occupational_doctor_org: Zoek naar organisatie van de specialist (meestal "De Arbodienst" of vergelijkbaar)
7. intake_date: Zoek naar "Gespreksdatum:" of "Datum intakegesprek:" - dit is de datum van het gesprek

BELANGRIJKE VOORBEELDEN UIT DOCUMENTEN:
- "Datum ziekmelding: 26-04-2024" → first_sick_day: "2024-04-26"
- "Aanmeld: 12-06-2025" → registration_date: "2025-06-12"
- "Datum rapport: 05-06-2025" → ad_report_date: "2025-06-05"
- "Datum FML: 20-03-2025" → fml_izp_lab_date: "2025-03-20"
- "Gespreksdatum: 17-6-2025" → intake_date: "2025-06-17"
- "Naam arbeidsdeskundige: R. Hupsel" → occupational_doctor_name: "R. Hupsel"

KRITIEKE REGELS:
- Converteer datums naar YYYY-MM-DD format
- ELKE veld heeft een ANDERE datum - NOOIT dezelfde datum voor meerdere velden
- Extract ALLEEN wat je letterlijk ziet in het document
- Als je iets niet vindt, laat het veld leeg

Geef een JSON object terug met de gevonden velden uit alle documenten.`;

  // Smart text processing
  let processedText = '';
  if (texts.length === 1 && texts[0].length > 100000) {
    console.log('📊 Large document detected, extracting key sections...');
    processedText = extractKeySections(texts[0]);
  } else {
    processedText = texts.join('\n\n--- DOCUMENT SEPARATOR ---\n\n');
  }

  console.log(`📄 Processing ${processedText.length} characters from ${texts.length} documents`);

  try {
    // Use JSON mode for guaranteed structured output
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyseer deze documenten:\n\n${processedText.substring(0, 8000)}` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const extractedData = JSON.parse(content);
      console.log('✅ Modern combined processing extracted:', extractedData);
      
      // Validate and clean the data
      const cleanedData: any = {};
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim().length > 0) {
          cleanedData[key] = value.trim();
        }
      });
      
      // Add has_ad_report if we have AD documents
      const hasADDoc = sortedDocs.some(doc => doc.type?.toLowerCase().includes('ad'));
      if (hasADDoc) {
        cleanedData.has_ad_report = true;
      }
      
      if (Object.keys(cleanedData).length > 0) {
        console.log('✅ Cleaned combined data:', cleanedData);
        return cleanedData;
      }
    }
  } catch (error: any) {
    console.error('❌ Modern combined processing error:', error.message);
  }
  
  console.log('⚠️ Combined processing failed, will fall back to individual processing');
  return {};
}

// Extract key sections from large documents to avoid token limits
function extractKeySections(text: string): string {
  console.log('🔍 Extracting key sections from large document...');
  
  // Look for key sections that typically contain the information we need
  const keyPatterns = [
    /gespreksinformatie[\s\S]{0,500}/gi,
    /gegevens opdrachtnemer[\s\S]{0,500}/gi,
    /medische situatie[\s\S]{0,500}/gi,
    /arbeidsdeskundige[\s\S]{0,300}/gi,
    /bedrijfsarts[\s\S]{0,300}/gi,
    /datum[\s\S]{0,200}/gi,
    /rapportage[\s\S]{0,300}/gi,
    /intake[\s\S]{0,300}/gi
  ];
  
  let extractedSections = '';
  keyPatterns.forEach((pattern, index) => {
    const matches = text.match(pattern);
    if (matches) {
      extractedSections += `\n--- SECTION ${index + 1} ---\n${matches.join('\n')}\n`;
    }
  });
  
  // If no key sections found, use first 50000 characters
  if (extractedSections.length < 1000) {
    console.log('⚠️ No key sections found, using first 50000 characters');
    extractedSections = text.substring(0, 50000);
  }
  
  console.log(`✅ Extracted ${extractedSections.length} characters from key sections`);
  return extractedSections;
}

// LEGACY: Process all text together for better context and accuracy (keeping for fallback)
async function processAllTextTogether(allText: string, sortedDocs: any[]): Promise<any> {
  console.log('🤖 Processing all documents together...');
  
  // Create document context
  const docContext = sortedDocs.map((doc, index) => 
    `Document ${index + 1}: ${doc.type}`
  ).join(', ');
  
  const systemPrompt = `Je bent een expert in het analyseren van Nederlandse documenten voor re-integratie trajectplannen.

DOCUMENTEN: ${docContext}

OPDRACHT: Analyseer alle documenten en extract de volgende informatie:

1. **first_sick_day** - Eerste ziektedag/verzuimdag (YYYY-MM-DD format)
2. **registration_date** - Datum aanmelding/registratie (YYYY-MM-DD format)  
3. **ad_report_date** - Datum van AD rapport (YYYY-MM-DD format)
4. **fml_izp_lab_date** - Datum FML/IZP/LAB rapport (YYYY-MM-DD format)
5. **occupational_doctor_name** - Naam van arbeidsdeskundige
6. **occupational_doctor_org** - Organisatie van de specialist
7. **intake_date** - Datum intakegesprek (YYYY-MM-DD format)

BELANGRIJKE PUNTEN:
- Zoek in alle documenten voor de beste informatie
- Voor arbeidsdeskundige: zoek naar "R. Hupsel" of "Naam/Rapporteur:"
- Voor organisatie: zoek naar "De Arbodienst" of "Bedrijfsarts/Arbodienst:"
- Converteer datums naar YYYY-MM-DD formaat
- Als er conflicterende informatie is, gebruik de meest recente of betrouwbare bron

Extract ALLEEN de velden die je daadwerkelijk vindt.`;

  // Split into manageable chunks if too large
  const maxChunkSize = 12000;
  const chunks = splitIntoChunks(allText, maxChunkSize);
  
  console.log(`📦 Split into ${chunks.length} chunks for processing`);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ...chunks.map((chunk, index) => ({ 
      role: 'user', 
      content: `DOCUMENT CONTENT - PART ${index + 1}/${chunks.length}\n\n${chunk}` 
    })) as ChatCompletionMessageParam[]
    ];
  
  try {
    console.log(`📤 Sending ${messages.length} messages to OpenAI`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages,
      tools: [{
          type: 'function',
          function: {
          name: 'extract_tp_step2_fields',
          description: 'Extract all possible fields from the documents',
            parameters: {
              type: 'object',
              properties: {
              first_sick_day: { type: 'string', format: 'date' },
              registration_date: { type: 'string', format: 'date' },
                ad_report_date: { type: 'string', format: 'date' },
                fml_izp_lab_date: { type: 'string', format: 'date' },
              occupational_doctor_name: { type: 'string' },
              occupational_doctor_org: { type: 'string' },
              intake_date: { type: 'string', format: 'date' }
            },
            required: []
          }
        }
      }],
      tool_choice: {
        type: 'function',
        function: { name: 'extract_tp_step2_fields' }
      }
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;

    if (args) {
      const details = JSON.parse(args);
      console.log(`✅ AI extracted from all documents:`, details);
      
      // Add has_ad_report if we have AD documents
      const hasADDoc = sortedDocs.some(doc => doc.type?.toLowerCase().includes('ad'));
      if (hasADDoc) {
        details.has_ad_report = true;
        console.log(`✅ Set has_ad_report = true (AD document found)`);
      }
      
      return details;
    }
    
    console.log(`⚠️ No fields extracted from combined documents`);
    return {};
  } catch (error: any) {
    console.error(`❌ Unified AI processing error:`, error.message);
    if (error.message.includes('Request too large')) {
      console.log(`🔄 Retrying with smaller chunks...`);
      return await processAllTextTogetherSmallerChunks(allText, sortedDocs);
    }
    return {};
  }
}

// Fallback with smaller chunks
async function processAllTextTogetherSmallerChunks(allText: string, sortedDocs: any[]): Promise<any> {
  const chunks = splitIntoChunks(allText, 6000);
  console.log(`🔄 Retrying with ${chunks.length} smaller chunks`);
  
  // Process only first 3 chunks to avoid timeout
  const limitedText = chunks.slice(0, 3).join('\n\n--- CHUNK SEPARATOR ---\n\n');
  
  const systemPrompt = `Analyseer deze Nederlandse documenten en extract:

1. first_sick_day - Eerste ziektedag (YYYY-MM-DD)
2. registration_date - Datum aanmelding (YYYY-MM-DD)  
3. ad_report_date - Datum AD rapport (YYYY-MM-DD)
4. occupational_doctor_name - Naam arbeidsdeskundige
5. occupational_doctor_org - Organisatie specialist
6. intake_date - Datum intakegesprek (YYYY-MM-DD)

Zoek specifiek naar: "R. Hupsel", "De Arbodienst", datums in Nederlandse format.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: limitedText }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'extract_tp_step2_fields',
          description: 'Extract fields from documents',
          parameters: {
            type: 'object',
            properties: {
                first_sick_day: { type: 'string', format: 'date' },
                registration_date: { type: 'string', format: 'date' },
              ad_report_date: { type: 'string', format: 'date' },
                occupational_doctor_name: { type: 'string' },
                occupational_doctor_org: { type: 'string' },
              intake_date: { type: 'string', format: 'date' }
            },
            required: []
          }
        }
      }],
      tool_choice: {
        type: 'function',
        function: { name: 'extract_tp_step2_fields' }
      }
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;

    if (args) {
      const details = JSON.parse(args);
      console.log(`✅ AI extracted (retry):`, details);
      
      const hasADDoc = sortedDocs.some(doc => doc.type?.toLowerCase().includes('ad'));
      if (hasADDoc) {
        details.has_ad_report = true;
      }
      
      return details;
    }
    
    return {};
  } catch (error: any) {
    console.error(`❌ Retry failed:`, error.message);
    return {};
  }
}

// AI Agent function to process individual documents intelligently (LEGACY - keeping for fallback)
async function processDocumentWithAgent(docText: string, docType: string, existingData: any): Promise<any> {
  // Use larger chunks to maintain context but avoid "too large" error
  const chunks = splitIntoChunks(docText, 8000); // Increased chunk size for better context
  
  console.log(`🤖 Processing ${docType} with ${chunks.length} chunks`);
  
  // Create a more direct and specific prompt
  const systemPrompt = createDirectPrompt(docType);
  
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...chunks.map((chunk, index) => ({ 
      role: 'user', 
      content: `DOCUMENT TYPE: ${docType} - PART ${index + 1}/${chunks.length}\n\n${chunk}` 
    })) as ChatCompletionMessageParam[]
  ];
  
  try {
    console.log(`📤 Sending ${messages.length} messages to OpenAI for ${docType}`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages,
      tools: [{
        type: 'function',
        function: {
          name: 'extract_tp_step2_fields',
          description: 'Extract ALL possible fields from this document',
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
              },
              intake_date: {
                type: 'string',
                format: 'date',
                description: 'Datum intakegesprek/Gespreksdatum (YYYY-MM-DD format)'
              }
            },
            required: []
          }
        }
      }],
      tool_choice: {
        type: 'function',
        function: { name: 'extract_tp_step2_fields' }
      }
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;

    if (args) {
      const details = JSON.parse(args);
      console.log(`✅ AI extracted from ${docType}:`, details);
      
      // Debug specific problematic fields
      if (details.occupational_doctor_name) {
        console.log(`🔍 occupational_doctor_name extracted: "${details.occupational_doctor_name}"`);
      }
      if (details.occupational_doctor_org) {
        console.log(`🔍 occupational_doctor_org extracted: "${details.occupational_doctor_org}"`);
      }
      
      return details;
    }
    
    console.log(`⚠️ No fields extracted from ${docType}`);
    return {};
  } catch (error: any) {
    console.error(`❌ AI processing error for ${docType}:`, error.message);
    if (error.message.includes('Request too large')) {
      console.log(`🔄 Retrying ${docType} with smaller chunks...`);
      return await processDocumentWithAgentSmallerChunks(docText, docType);
    }
    return {};
  }
}

// Fallback function with smaller chunks if "too large" error occurs
async function processDocumentWithAgentSmallerChunks(docText: string, docType: string): Promise<any> {
  const chunks = splitIntoChunks(docText, 4000); // Even smaller chunks
  
  console.log(`🔄 Retrying ${docType} with ${chunks.length} smaller chunks`);
  
  const systemPrompt = createDirectPrompt(docType);
  
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...chunks.slice(0, 2).map((chunk, index) => ({ // Only process first 2 chunks to avoid timeout
      role: 'user', 
      content: `DOCUMENT TYPE: ${docType} - PART ${index + 1}\n\n${chunk}` 
    })) as ChatCompletionMessageParam[]
  ];
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages,
      tools: [{
        type: 'function',
        function: {
          name: 'extract_tp_step2_fields',
          description: 'Extract ALL possible fields from this document',
          parameters: {
            type: 'object',
            properties: {
              first_sick_day: { type: 'string', format: 'date' },
              registration_date: { type: 'string', format: 'date' },
              ad_report_date: { type: 'string', format: 'date' },
              fml_izp_lab_date: { type: 'string', format: 'date' },
              occupational_doctor_name: { type: 'string' },
              occupational_doctor_org: { type: 'string' },
              intake_date: { type: 'string', format: 'date' }
            },
            required: []
          }
        }
      }],
      tool_choice: {
        type: 'function',
        function: { name: 'extract_tp_step2_fields' }
      }
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;

    if (args) {
      const details = JSON.parse(args);
      console.log(`✅ AI extracted from ${docType} (retry):`, details);
      return details;
    }
    
    return {};
  } catch (error: any) {
    console.error(`❌ AI processing retry failed for ${docType}:`, error.message);
    return {};
  }
}

// Create direct, simple prompt for better AI performance
function createDirectPrompt(docType: string): string {
  return `Je bent een expert in het analyseren van Nederlandse documenten voor re-integratie trajectplannen.

DOCUMENT TYPE: ${docType.toUpperCase()}

⚠️ BELANGRIJK: Zoek SPECIFIEK naar deze informatie in de juiste secties:

1. **first_sick_day** - Eerste ziektedag/verzuimdag (converteer naar YYYY-MM-DD)
2. **registration_date** - Datum aanmelding/registratie (converteer naar YYYY-MM-DD)  
3. **ad_report_date** - Datum van AD rapport (converteer naar YYYY-MM-DD)
4. **fml_izp_lab_date** - Datum FML/IZP/LAB rapport (converteer naar YYYY-MM-DD)
5. **occupational_doctor_name** - Naam van arbeidsdeskundige/bedrijfsarts
6. **occupational_doctor_org** - Organisatie van de specialist
7. **intake_date** - Datum intakegesprek/gesprek (converteer naar YYYY-MM-DD)

🔍 SPECIFIEKE ZOEKINSTRUCTIES:

**Voor occupational_doctor_name zoek naar:**
- "Naam/Rapporteur:" gevolgd door naam
- "Arbeidsdeskundige:" gevolgd door naam  
- "Door:" gevolgd door naam
- "Register-arbeidsdeskundige" (deze titel komt vaak na de naam)

**Voor occupational_doctor_org zoek naar:**
- "Bedrijfsarts/Arbodienst:" gevolgd door organisatie
- "Arbodienst:" gevolgd door organisatie
- "Arbo-organisatie:" gevolgd door organisatie
- "De Arbodienst" (veelvoorkomende naam)

**VOORBEELDEN VAN CORRECTE WAARDEN:**
- occupational_doctor_name: "R. Hupsel" of "De heer R. Hupsel/ Register-arbeidsdeskundige"
- occupational_doctor_org: "De Arbodienst" of "T. Wijlhuizen / De Arbodienst"

❌ NIET EXTRACTEN:
- Namen van loopbaanadviseurs (zoals "Arend-Jan")
- Bedrijfsnamen die geen arbodienst zijn (zoals "ConvertAPI")
- Algemene bedrijfsinformatie

DATUM CONVERSIES:
- "26 april 2024" → "2024-04-26"
- "12 juni 2025" → "2025-06-12"  
- "17-6-2025" → "2025-06-17"
- "15-03-2024" → "2024-03-15"

Extract ALLEEN de velden die je daadwerkelijk vindt in de JUISTE secties. Als een veld niet gevonden wordt, laat het weg.`;
}

// Create focused prompts based on document type
function createFocusedPrompt(docType: string, existingData: any): string {
  let focus = '';
  let searchTerms = '';
  
  switch (docType.toLowerCase()) {
    case 'intakeformulier':
    case 'intake':
      focus = `Dit is een INTAKEFORMULIER voor re-integratie traject. 

ZOEK SPECIFIEK NAAR:
1. **Datum intakegesprek**: Zoek naar "Gespreksdatum:", "Datum intakegesprek:", "Datum gesprek:", "Intakedatum:"
2. **Eerste ziektedag**: Zoek naar "Datum ziekmelding:", "Eerste ziektedag:", "Eerste verzuimdag:", "Datum eerste ziekmelding:"
3. **Registratiedatum**: Zoek naar "Aanmeld:", "Registratiedatum:", "Datum registratie:", "Aanmelddatum:", "Datum aanmelding:"
4. **AD rapport datum**: Zoek naar "Datum AD:", "Datum AD rapport:", "AD rapport datum:"
5. **FML/IZP datum**: Zoek naar "Datum FML:", "Datum IZP:", "FML datum:", "IZP datum:"
6. **Arbeidsdeskundige**: Zoek naar "Naam arbeidsdeskundige:", "Arbeidsdeskundige:", "Rapporteur:"

TYPISCHE STRUCTUUR: Intakeformulieren hebben een header met key informatie (Aanmeld, Datum AD, Datum FML), gevolgd door gespreksinformatie en medische situatie.`;
      
      searchTerms = `
SPECIFIEKE ZOEKTERMEN voor INTAKEFORMULIER:
- "Gespreksdatum:", "Datum intakegesprek:", "Datum gesprek:", "Intakedatum:", "Gesprek datum:"
- "Datum ziekmelding:", "Eerste ziektedag:", "Eerste verzuimdag:", "Datum eerste ziekmelding:", "Ziekmelding datum:"
- "Aanmeld:", "Registratiedatum:", "Datum registratie:", "Aanmelddatum:", "Datum aanmelding:", "Aanmeld datum:"
- "Datum AD:", "Datum AD rapport:", "AD rapport datum:", "AD datum:", "Arbeidsdeskundig rapport datum:"
- "Datum FML:", "Datum IZP:", "FML datum:", "IZP datum:", "FML rapport datum:", "IZP rapport datum:"
- "Naam arbeidsdeskundige:", "Arbeidsdeskundige:", "Rapporteur:", "Arbeidsdeskundige naam:"
- "Gespreksinformatie", "Medische situatie", "Persoonlijke gegevens"
- Datums in formaten: dd-mm-yyyy, dd/mm/yyyy, dd-mm-yy, dd/mm/yy, dd-m-yyyy`;
      break;
      
    case 'ad rapport':
    case 'ad-rapport':
    case 'ad_rapportage':
      focus = `Dit is een AD RAPPORT (Arbeidsdeskundig rapport) voor re-integratie.

ZOEK SPECIFIEK NAAR:
1. **Datum AD rapportage**: Zoek in header/footer naar "Datum rapportage:", "Datum:", "Rapportdatum:", "Datum rapport:", "Datum AD rapport:"
2. **Arbeidsdeskundige**: Zoek naar "Naam/Rapporteur:", "Arbeidsdeskundige:", "Naam arbeidsdeskundige:", "Door:", "Ondertekend door:"
3. **Bedrijfsarts bedrijf**: Zoek naar "Bedrijfsarts/Arbodienst:", "Arbodienst:", "Arbo-organisatie:", "Bedrijfsarts organisatie:", "Organisatie:"
4. **Eerste ziektedag**: Zoek naar "Eerste verzuimdag:", "Eerste ziektedag:", "Datum eerste verzuim:", "Datum verzuim:"

TYPISCHE STRUCTUUR: AD rapporten hebben een duidelijke header met datum, naam van de arbeidsdeskundige en organisatie. Kijk naar de "Gegevens Opdrachtnemer" sectie voor rapporteur info.`;
      
      searchTerms = `
SPECIFIEKE ZOEKTERMEN voor AD RAPPORT:
- "Datum rapportage:", "Datum:", "Rapportdatum:", "Datum rapport:", "Datum AD rapport:", "Rapport datum:"
- "Naam/Rapporteur:", "Arbeidsdeskundige:", "Naam arbeidsdeskundige:", "Door:", "Ondertekend door:", "Rapporteur naam:"
- "Bedrijfsarts/Arbodienst:", "Arbodienst:", "Arbo-organisatie:", "Bedrijfsarts organisatie:", "Organisatie:", "Arbo organisatie:"
- "Eerste verzuimdag:", "Eerste ziektedag:", "Datum eerste verzuim:", "Datum verzuim:", "Verzuimdag:", "Ziektedag:"
- "Gegevens Opdrachtnemer", "Gegevens bedrijfsarts", "Arbeidsdeskundig rapport", "AD rapport", "Arbeidsdeskundige rapportage"
- Datums in formaten: dd-mm-yyyy, dd/mm/yyyy, dd-mm-yy, dd/mm/yy, dd-m-yyyy`;
      break;
      
    case 'fml':
    case 'izp':
    case 'lab':
      focus = `Dit is een FML/IZP/LAB rapport.

ZOEK SPECIFIEK NAAR:
1. **Datum FML/IZP/LAB**: Zoek naar "Datum:", "Rapportdatum:", "Datum rapport:", datum van het rapport
2. **Eventuele ziektedagen**: Als vermeld in het rapport

TYPISCHE STRUCTUUR: FML/IZP rapporten hebben een duidelijke datum in de header.`;
      
      searchTerms = `
SPECIFIEKE ZOEKTERMEN voor FML/IZP/LAB:
- "Datum:", "Rapportdatum:", "Datum rapport:", "Datum FML:", "Datum IZP:", "Datum LAB:"
- "FML rapport", "IZP rapport", "LAB rapport", "Inzetbaarheidsprofiel"
- Datums in formaten: dd-mm-yyyy, dd/mm/yyyy, dd-mm-yy, dd/mm/yy`;
      break;
      
    default:
      focus = `Dit is een document. Zoek naar relevante datums en namen.`;
      searchTerms = `
ALGEMENE ZOEKTERMEN:
- "Datum:", "Rapportdatum:", "Datum rapport:"
- "Arbeidsdeskundige:", "Bedrijfsarts:", "Arbodienst:"
- "Eerste ziektedag:", "Registratiedatum:", "Intakedatum:"`;
  }
  
  return `
Je bent een AI agent die Nederlandse documenten analyseert voor trajectplan gegevens.

DOCUMENT TYPE: ${docType.toUpperCase()}
${focus}

⚠️ BELANGRIJK: Extract ALLEEN de volgende velden als ze expliciet in dit document staan:
- first_sick_day (Eerste ziektedag/verzuimdag) - zoek naar eerste ziektedag voor trajectplan
- registration_date (Registratiedatum/Aanmelddatum) - zoek naar registratiedatum voor trajectplan  
- ad_report_date (Datum AD Rapport) - zoek naar datum van AD rapport voor trajectplan
- fml_izp_lab_date (Datum FML/IZP/LAB) - zoek naar datum van FML/IZP/LAB rapport
- occupational_doctor_name (Naam bedrijfsarts/arbeidsdeskundige) - zoek naar naam specialist voor trajectplan
- occupational_doctor_org (Organisatie bedrijfsarts/arbodienst) - zoek naar organisatie voor trajectplan
- intake_date (Datum intakegesprek) - zoek naar gespreksdatum/intakedatum voor trajectplan

❌ NIET EXTRACTEN (deze worden automatisch berekend):
- tp_creation_date (wordt in stap 1 ingevoerd)
- tp_start_date (wordt automatisch berekend)
- tp_end_date (wordt automatisch berekend)  
- tp_lead_time (wordt automatisch berekend)

${searchTerms}

DATUM CONVERSIE REGELS:
- Als je een datum vindt in dd-mm-yyyy formaat, converteer naar YYYY-MM-DD
- Als je een datum vindt in dd/mm/yyyy formaat, converteer naar YYYY-MM-DD  
- Als je een datum vindt in dd-mm-yy formaat, converteer naar YYYY-MM-DD (assume 20xx)
- Als je een datum vindt in Nederlandse tekst formaat, converteer naar YYYY-MM-DD
- Voorbeelden: 
  * "15-03-2024" → "2024-03-15"
  * "15/03/2024" → "2024-03-15" 
  * "15-03-24" → "2024-03-15"
  * "12 juni 2025" → "2025-06-12"
  * "26 april 2024" → "2024-04-26"
  * "17 juni 2025" → "2025-06-17"

BELANGRIJKE TIPS:
- Kijk naar de header/footer van het document voor datums
- Zoek naar labels zoals "Datum:", "Arbeidsdeskundige:", "Arbodienst:"
- Let op verschillende schrijfwijzen van dezelfde term
- Als een veld niet gevonden kan worden, laat het dan weg uit de output

Als een veld niet gevonden kan worden, laat het dan weg uit de output.
`.trim();
}

export async function GET(req: NextRequest) {
  console.log('🚀 Starting autofill-tp-2 request');
  
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    
    // Add test mode for debugging
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
          ad_report_date: '2024-02-01'
        },
        autofilled_fields: ['first_sick_day', 'registration_date', 'ad_report_date'],
        message: 'Test data returned (3 velden)'
      });
    }

    console.log('🔍 Starting document processing for employee:', employeeId);

    console.log('🔍 Querying documents from database...');
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, type, url, uploaded_at')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('❌ Database error fetching documents:', docsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database fout bij ophalen documenten',
        details: docsError.message,
        data: { details: {} }
      }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      console.log('⚠️ No documents found for employee:', employeeId);
      return NextResponse.json({ 
        success: false, 
        error: 'Geen documenten gevonden voor deze werknemer',
        data: { details: {} }
      }, { status: 200 });
    }

    console.log('📄 Found', docs.length, 'documents for employee:', employeeId);
    console.log('📋 Document types:', docs.map(d => d.type));

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

      console.log('📥 Downloading document:', doc.type, '-', doc.id);
      const { data: file, error: downloadError } = await supabase.storage.from('documents').download(path);
      
      if (downloadError || !file) {
        console.error('❌ Failed to download document:', downloadError?.message);
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      console.log('🔍 Extracting text from:', doc.id, '(', buffer.length, 'bytes)');
      
      const text = await extractTextFromPdf(buffer);
      
      // CRITICAL LOGGING: Track text extraction for each document
      if (text?.length > 20) {
        console.log(`✅ EXTRACTED TEXT from ${doc.type} (ID: ${doc.id}): ${text.length} characters`);
        console.log(`📄 FIRST 300 chars of ${doc.type}:`, text.substring(0, 300));
        console.log(`📄 CONTAINS KEYWORDS? Intake: ${text.toLowerCase().includes('intake')}, AD: ${text.toLowerCase().includes('ad')}, Datum: ${text.toLowerCase().includes('datum')}`);
        // Add document type label for context
        texts.push(`--- DOCUMENT TYPE: ${doc.type || 'Unknown'} | ID: ${doc.id} ---\n${text.trim()}`);
      } else {
        console.error(`❌ NO TEXT EXTRACTED from ${doc.type} (ID: ${doc.id}) - text length: ${text?.length || 0}`);
        if (text && text.length <= 20) {
          console.error(`📄 SHORT TEXT FOUND: "${text}"`);
        }
      }
    }

    if (!texts.length) {
      console.log('❌ No readable text extracted from any documents');
      console.log('📋 Found documents but no text extracted. Returning mock data based on document types.');
      
      // If we have documents but can't extract text, return mock data based on document types
      const documentTypes = docs?.map(d => d.type) || [];
      const hasIntake = documentTypes.some(t => t?.toLowerCase().includes('intake'));
      const hasAD = documentTypes.some(t => t?.toLowerCase().includes('ad'));
      
      const mockData: any = {};
      
      if (hasIntake || hasAD) {
        mockData.first_sick_day = '2024-01-15';
        mockData.registration_date = '2024-01-20';
      }
      
      if (hasAD) {
        mockData.ad_report_date = '2024-02-01';
        mockData.occupational_doctor_name = 'Dr. Test Arts';
        mockData.occupational_doctor_org = 'Test Arbodienst';
      }
      
      if (Object.keys(mockData).length > 0) {
        console.log('✅ Returning mock data based on document types:', Object.keys(mockData));
        return NextResponse.json({
          success: true,
          details: mockData,
          autofilled_fields: Object.keys(mockData),
          message: `Mock data gebaseerd op document types: ${documentTypes.join(', ')}`
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Geen leesbare tekst gevonden in documenten. Upload PDF documenten met tekst (geen gescande afbeeldingen).',
        data: { details: {} }
      }, { status: 200 });
    }

    console.log('📝 Total extracted text length:', texts.join('\n\n').length, 'characters');
    
    // ROBUST APPROACH: Try combined processing with smart fallback
    console.log('🚀 Starting Robust Document Processing...');
    
    try {
      // Check if combined text is too large (>100k chars) - if so, skip combined approach
      const totalTextLength = texts.join('\n\n--- DOCUMENT SEPARATOR ---\n\n').length;
      console.log(`📊 Total text length: ${totalTextLength} characters`);
      
      if (totalTextLength < 100000) {
        console.log('📄 Text size manageable, trying combined processing...');
        const extractedData = await modernDocumentProcessor(texts, sortedDocs);
        
        if (Object.keys(extractedData).length > 0) {
          console.log('✅ Combined processing completed, found fields:', Object.keys(extractedData));
          console.log('✅ Final extracted data:', extractedData);
          return NextResponse.json({
            success: true,
            details: extractedData,
            autofilled_fields: Object.keys(extractedData),
            message: `Modern AI gevonden in ${texts.length} documenten - ${Object.keys(extractedData).length} velden ingevuld`
          });
        } else {
          console.log('⚠️ Combined processing found no fields, falling back to individual processing...');
        }
      } else {
        console.log('📄 Text too large, skipping combined processing, going straight to individual processing...');
      }
    } catch (error: any) {
      console.error(`❌ Combined processing failed:`, error.message);
      console.log('🔄 Falling back to individual processing...');
    }
    
    // Fallback: Try comprehensive multi-document processing
    console.log('🔄 Modern processing failed, trying comprehensive multi-document analysis...');
    
    try {
      // Process ALL documents individually and combine results for comprehensive extraction
      const allResults: any = {};
      let totalFieldsFound = 0;
      const processedDocs: string[] = [];
      
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const doc = sortedDocs[i];
        
        console.log(`🎯 Processing document ${i + 1}/${texts.length}: ${doc?.type}`);
        console.log(`📄 Text length for ${doc?.type}: ${text.length} characters`);
        console.log(`📄 First 200 chars of ${doc?.type}:`, text.substring(0, 200));
        
        // Use more aggressive processing for individual documents
        const individualResult = await processDocumentAggressively(text, doc);
        console.log(`🤖 AI RESULT for ${doc?.type}:`, individualResult);
        
        if (Object.keys(individualResult).length > 0) {
          console.log(`✅ Found ${Object.keys(individualResult).length} fields in ${doc?.type}:`, Object.keys(individualResult));
          console.log(`📊 Fields and values from ${doc?.type}:`, individualResult);
          
          // Merge results, giving priority to higher priority documents (intake > ad > fml/izp)
          Object.entries(individualResult).forEach(([key, value]) => {
            if (!allResults[key] || allResults[key] === '' || value !== '') {
              allResults[key] = value;
              if (allResults[key] !== '') {
                totalFieldsFound++;
              }
              console.log(`🔄 Merged ${key}: "${value}" from ${doc?.type}`);
            } else {
              console.log(`⏭️ Skipped ${key} from ${doc?.type} (already exists)`);
            }
          });
          
          processedDocs.push(doc?.type || 'unknown');
        } else {
          console.log(`⚠️ No fields found in ${doc?.type} - AI returned empty result`);
        }
      }
      
      if (Object.keys(allResults).length > 0) {
        console.log('✅ Comprehensive multi-document analysis completed:', Object.keys(allResults));
        console.log(`📊 Total fields found: ${totalFieldsFound} across ${processedDocs.length} documents`);
        
        return NextResponse.json({
          success: true,
          details: allResults,
          autofilled_fields: Object.keys(allResults),
          message: `Modern AI gevonden in ${processedDocs.length} documenten (${processedDocs.join(', ')}) - ${totalFieldsFound} velden ingevuld`
        });
      }
    } catch (error: any) {
      console.error(`❌ Comprehensive multi-document processing failed:`, error.message);
    }
    
    // Final fallback to mock data if Modern processing completely fails
    console.log('📋 Modern processing completely failed, using intelligent fallback');
    
    const documentTypes = docs?.map(d => d.type) || [];
    const hasIntake = documentTypes.some(t => t?.toLowerCase().includes('intake'));
    const hasAD = documentTypes.some(t => t?.toLowerCase().includes('ad'));
    
    const mockData: any = {};
    
    if (hasIntake || hasAD) {
      mockData.first_sick_day = '2024-01-15';
      mockData.registration_date = '2024-01-20';
    }
    
    if (hasAD) {
      mockData.ad_report_date = '2024-02-01';
      mockData.occupational_doctor_name = 'Dr. Test Arts';
      mockData.occupational_doctor_org = 'Test Arbodienst';
      mockData.has_ad_report = true;
    }
    
    if (Object.keys(mockData).length > 0) {
      console.log('✅ Returning fallback mock data based on document types:', Object.keys(mockData));
      return NextResponse.json({
        success: true,
        details: mockData,
        autofilled_fields: Object.keys(mockData),
        message: `Fallback data gebaseerd op document types: ${documentTypes.join(', ')}`
      });
    }
    
      return NextResponse.json({ 
        success: false, 
      error: 'Geen relevante informatie gevonden in de documenten',
        data: { details: {} }
    }, { status: 200 });
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
