import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAIService } from '@/lib/openai-service';
import { MijnStemService } from '@/lib/mijn-stem-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { userId, originalText, sectionType } = await req.json();

    if (!userId || !originalText || !sectionType) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, originalText, sectionType' 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openaiService = OpenAIService.getInstance();
    const mijnStemService = MijnStemService.getInstance();

    // Get user's writing style
    const userWritingStyle = await mijnStemService.getUserWritingStyle(userId);

    if (!userWritingStyle) {
      return NextResponse.json({ 
        error: 'No writing style found. Please upload and analyze some documents first.',
        hasStyle: false
      }, { status: 404 });
    }

    // Generate style-specific prompt
    const stylePrompt = mijnStemService.generateStylePrompt(userWritingStyle);

    // Create system prompt for rewriting
    const systemPrompt = `
Je bent een expert in het herschrijven van Nederlandse re-integratierapporten in een specifieke schrijfstijl.

TAK: Herschrijf de gegeven tekst in de schrijfstijl van de gebruiker, terwijl je de inhoud en betekenis behoudt.

${stylePrompt}

INSTRUCTIES:
- Behoud alle belangrijke informatie en feiten
- Pas de schrijfstijl aan naar de gebruiker zijn stijl
- Houd dezelfde structuur en lengte
- Gebruik dezelfde formaliteitsniveau
- Behoud de Nederlandse taal
- Geef alleen de herschreven tekst terug, geen uitleg

SECTIE TYPE: ${sectionType}
`.trim();

    const userPrompt = `
Herschrijf deze tekst in mijn schrijfstijl:

ORIGINELE TEKST:
${originalText}

Geef alleen de herschreven tekst terug, zonder uitleg of commentaar.
`.trim();

    const response = await openaiService.generateText(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.2,
        maxTokens: 2000,
        model: 'gpt-4o'
      }
    );

    return NextResponse.json({
      success: true,
      rewrittenText: response,
      originalText: originalText,
      sectionType: sectionType,
      styleUsed: {
        tone: userWritingStyle.tone,
        formality: userWritingStyle.formality,
        structure: userWritingStyle.structure
      }
    });

  } catch (error: any) {
    console.error('Rewrite error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during rewrite',
      details: error.message 
    }, { status: 500 });
  }
}
