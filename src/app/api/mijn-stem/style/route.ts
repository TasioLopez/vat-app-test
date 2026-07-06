import { NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/api-auth';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { data: documents, error } = await authResult.supabase
      .from('mijn_stem_documents')
      .select('writing_style, filename, analyzed_at')
      .eq('user_id', authResult.user.id)
      .eq('status', 'analyzed')
      .order('analyzed_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch writing styles' }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        hasStyle: false,
        message: 'No analyzed documents found',
      });
    }

    const masterStyle = combineWritingStyles(documents.map((doc) => doc.writing_style));

    return NextResponse.json({
      success: true,
      hasStyle: true,
      masterStyle,
      documentCount: documents.length,
      documents: documents.map((doc) => ({
        filename: doc.filename,
        analyzedAt: doc.analyzed_at,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function combineWritingStyles(styles: unknown[]): Record<string, unknown> | null {
  if (styles.length === 0) return null;
  if (styles.length === 1) return styles[0] as Record<string, unknown>;

  const asRecords = styles.filter((s): s is Record<string, string> => !!s && typeof s === 'object');
  return {
    tone: mostCommonValue(asRecords.map((s) => s.tone)),
    structure: mostCommonValue(asRecords.map((s) => s.structure)),
    formality: mostCommonValue(asRecords.map((s) => s.formality)),
    combined_from: styles.length,
    last_updated: new Date().toISOString(),
  };
}

function mostCommonValue(values: string[]): string {
  const counts: Record<string, number> = {};
  values.forEach((value) => {
    if (value) counts[value] = (counts[value] || 0) + 1;
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
