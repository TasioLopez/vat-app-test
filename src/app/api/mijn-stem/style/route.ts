import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all analyzed documents for this user
    const { data: documents, error } = await supabase
      .from('mijn_stem_documents')
      .select('writing_style, filename, analyzed_at')
      .eq('user_id', userId)
      .eq('status', 'analyzed')
      .order('analyzed_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch writing styles' }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        hasStyle: false,
        message: 'No analyzed documents found'
      });
    }

    // Combine all writing styles into a master style profile
    const masterStyle = combineWritingStyles(documents.map(doc => doc.writing_style));

    return NextResponse.json({
      success: true,
      hasStyle: true,
      masterStyle,
      documentCount: documents.length,
      documents: documents.map(doc => ({
        filename: doc.filename,
        analyzedAt: doc.analyzed_at
      }))
    });

  } catch (error: any) {
    console.error('Style fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function combineWritingStyles(styles: any[]): any {
  if (styles.length === 0) return null;
  if (styles.length === 1) return styles[0];

  // Combine multiple writing styles into a master style
  const combined = {
    tone: mostCommonValue(styles.map(s => s.tone)),
    structure: mostCommonValue(styles.map(s => s.structure)),
    language_usage: mostCommonValue(styles.map(s => s.language_usage)),
    sentence_length: mostCommonValue(styles.map(s => s.sentence_length)),
    paragraph_length: mostCommonValue(styles.map(s => s.paragraph_length)),
    perspective: mostCommonValue(styles.map(s => s.perspective)),
    formality: mostCommonValue(styles.map(s => s.formality)),
    special_elements: mostCommonValue(styles.map(s => s.special_elements)),
    sample_phrases: styles.flatMap(s => s.sample_phrases || []).slice(0, 10), // Top 10 phrases
    writing_guidelines: styles.flatMap(s => s.writing_guidelines || []),
    combined_from: styles.length,
    last_updated: new Date().toISOString()
  };

  return combined;
}

function mostCommonValue(values: string[]): string {
  const counts: { [key: string]: number } = {};
  values.forEach(value => {
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  let mostCommon = '';
  let maxCount = 0;
  Object.entries(counts).forEach(([value, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = value;
    }
  });

  return mostCommon || values[0] || '';
}
