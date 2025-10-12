import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAIService } from '@/lib/openai-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openaiService = OpenAIService.getInstance();

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('mijn_stem_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status === 'analyzed') {
      return NextResponse.json({ 
        success: true, 
        message: 'Document already analyzed',
        writingStyle: document.writing_style 
      });
    }

    // Update status to processing
    await supabase
      .from('mijn_stem_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      await supabase
        .from('mijn_stem_documents')
        .update({ status: 'error', error_message: 'Failed to download file' })
        .eq('id', documentId);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    // Convert file to text
    let text = '';
    if (document.file_type === 'application/pdf') {
      text = await extractTextFromPdf(await fileData.arrayBuffer());
    } else if (document.file_type === 'text/plain') {
      text = await fileData.text();
    } else {
      // For DOC/DOCX files, we'll need a different approach
      // For now, we'll skip them or use a library like mammoth
      await supabase
        .from('mijn_stem_documents')
        .update({ status: 'error', error_message: 'DOC/DOCX files not yet supported' })
        .eq('id', documentId);
      return NextResponse.json({ error: 'DOC/DOCX files not yet supported' }, { status: 400 });
    }

    if (!text || text.length < 100) {
      await supabase
        .from('mijn_stem_documents')
        .update({ status: 'error', error_message: 'Could not extract sufficient text from document' })
        .eq('id', documentId);
      return NextResponse.json({ error: 'Could not extract sufficient text from document' }, { status: 400 });
    }

    // Analyze writing style with AI
    const systemPrompt = `
Je bent een expert in het analyseren van Nederlandse schrijfstijlen voor re-integratierapporten.
Analyseer het gegeven document en identificeer de unieke schrijfstijl van de auteur.

Focus op de volgende aspecten:
1. TONALITEIT: Zakelijk, warm, formeel, informeel, empathisch, etc.
2. STRUCTUUR: Hoe worden alinea's en zinnen gestructureerd?
3. TAALGEBRUIK: Specifieke woorden, uitdrukkingen, jargon
4. LENGTE: Gemiddelde zin- en alinealengte
5. PERSPECTIEF: Eerste/derde persoon, direct/indirect
6. FORMALITEIT: Formele vs informele taal
7. SPECIALE ELEMENTEN: Bullet points, nummering, koppen, etc.

Geef een gedetailleerde analyse terug in JSON formaat.
`;

    const userPrompt = `
Analyseer de schrijfstijl van dit Nederlandse re-integratierapport:

${text.slice(0, 15000)} // Limit to avoid token limits

Geef een gedetailleerde analyse terug in dit JSON formaat:
{
  "tone": "beschrijving van de tonaliteit",
  "structure": "beschrijving van de structuur",
  "language_usage": "beschrijving van het taalgebruik",
  "sentence_length": "kort/gemiddeld/lang",
  "paragraph_length": "kort/gemiddeld/lang",
  "perspective": "eerste/derde persoon",
  "formality": "formeel/informeel/gemengd",
  "special_elements": "bullet points, nummering, etc.",
  "sample_phrases": ["karakteristieke zinnen uit het document"],
  "writing_guidelines": [
    "specifieke richtlijnen voor het repliceren van deze stijl"
  ]
}
`;

    const response = await openaiService.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    let writingStyle;
    try {
      writingStyle = JSON.parse(response);
    } catch (parseError) {
      // If JSON parsing fails, create a basic structure
      writingStyle = {
        tone: "Zakelijk",
        structure: "Gestructureerd",
        language_usage: "Professioneel Nederlands",
        analysis: response,
        error: "Could not parse detailed analysis"
      };
    }

    // Save analysis to database
    const { error: updateError } = await supabase
      .from('mijn_stem_documents')
      .update({
        status: 'analyzed',
        writing_style: writingStyle,
        analyzed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to save analysis:', updateError);
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      writingStyle,
      message: 'Document analyzed successfully'
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Simple PDF text extraction - you might want to use a more robust library like pdf-parse
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // Basic PDF text extraction - this is very basic and might not work for all PDFs
    // For production, consider using pdf-parse or similar
    const textMatch = text.match(/BT[\s\S]*?ET/g);
    if (textMatch) {
      return textMatch.join(' ').replace(/[^\w\s.,!?;:()-]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    // Fallback: try to extract readable text
    return text.replace(/[^\w\s.,!?;:()-]/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}
