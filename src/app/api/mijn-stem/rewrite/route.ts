import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/openai-service';
import { MijnStemService } from '@/lib/mijn-stem-service';
import { isAuthError, requireAuth } from '@/lib/auth/api-auth';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { originalText, sectionType } = await req.json();
    if (!originalText || !sectionType) {
      return NextResponse.json(
        { error: 'Missing required fields: originalText, sectionType' },
        { status: 400 }
      );
    }

    const userId = authResult.user.id;
    const openaiService = OpenAIService.getInstance();
    const mijnStemService = MijnStemService.getInstance();
    const userWritingStyle = await mijnStemService.getUserWritingStyle(userId);

    if (!userWritingStyle) {
      return NextResponse.json(
        {
          error: 'No writing style found. Please upload and analyze some documents first.',
          hasStyle: false,
        },
        { status: 404 }
      );
    }

    const stylePrompt = mijnStemService.generateStylePrompt(userWritingStyle);
    const systemPrompt = `
Je bent een expert in het herschrijven van Nederlandse re-integratierapporten in een specifieke schrijfstijl.
${stylePrompt}
SECTIE TYPE: ${sectionType}
`.trim();

    const userPrompt = `Herschrijf deze tekst in mijn schrijfstijl:\n\n${originalText}`;
    const response = await openaiService.generateText(systemPrompt, userPrompt, {
      temperature: 0.2,
      maxTokens: 2000,
      model: 'gpt-4o',
    });

    return NextResponse.json({
      success: true,
      rewrittenText: response,
      originalText,
      sectionType,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
