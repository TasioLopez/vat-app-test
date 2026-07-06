import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/api-auth';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const documentId = req.nextUrl.searchParams.get('documentId');
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
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    await supabaseAdmin.storage.from('documents').remove([document.storage_path]);

    const { error: dbError } = await authResult.supabase
      .from('mijn_stem_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', authResult.user.id);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to delete document from database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
