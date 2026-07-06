import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/openai-service';
import { isAuthError, requireAuth } from '@/lib/auth/api-auth';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const { data: document, error: docError } = await authResult.supabase
      .from('mijn_stem_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', authResult.user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status === 'analyzed') {
      return NextResponse.json({
        success: true,
        message: 'Document already analyzed',
        writingStyle: document.writing_style,
      });
    }

    await authResult.supabase
      .from('mijn_stem_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      await authResult.supabase
        .from('mijn_stem_documents')
        .update({ status: 'error', error_message: 'Failed to download file' })
        .eq('id', documentId);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    let text = '';
    if (document.file_type === 'application/pdf') {
      text = await extractTextFromPdf(await fileData.arrayBuffer());
    } else if (document.file_type === 'text/plain') {
      text = await fileData.text();
    } else {
      await authResult.supabase
        .from('mijn_stem_documents')
        .update({ status: 'error', error_message: 'DOC/DOCX files not yet supported' })
        .eq('id', documentId);
      return NextResponse.json({ error: 'DOC/DOCX files not yet supported' }, { status: 400 });
    }

    if (!text || text.length < 100) {
      await authResult.supabase
        .from('mijn_stem_documents')
        .update({ status: 'error', error_message: 'Could not extract sufficient text from document' })
        .eq('id', documentId);
      return NextResponse.json({ error: 'Could not extract sufficient text from document' }, { status: 400 });
    }

    const openaiService = OpenAIService.getInstance();
    const systemPrompt = `
Je bent een expert in het analyseren van Nederlandse schrijfstijlen voor re-integratierapporten.
Analyseer het gegeven document en identificeer de unieke schrijfstijl van de auteur.
Geef een gedetailleerde analyse terug in JSON formaat.
`.trim();

    const userPrompt = `
Analyseer de schrijfstijl van dit Nederlandse re-integratierapport:

${text.slice(0, 15000)}
`.trim();

    const response = await openaiService.generateText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 3000,
      model: 'gpt-4o',
    });

    let writingStyle: Record<string, unknown>;
    try {
      writingStyle = JSON.parse(response);
    } catch {
      writingStyle = {
        tone: 'Zakelijk',
        structure: 'Gestructureerd',
        language_usage: 'Professioneel Nederlands',
        analysis: response,
      };
    }

    const { error: updateError } = await authResult.supabase
      .from('mijn_stem_documents')
      .update({
        status: 'analyzed',
        writing_style: writingStyle,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      writingStyle,
      message: 'Document analyzed successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    const textMatch = text.match(/BT[\s\S]*?ET/g);
    if (textMatch) {
      return textMatch.join(' ').replace(/[^\w\s.,!?;:()-]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return text.replace(/[^\w\s.,!?;:()-]/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}
