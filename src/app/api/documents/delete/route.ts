import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth, verifyDocumentPathAccess } from '@/lib/auth/api-auth';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export async function POST(req: NextRequest) {
  try {
    const { id, url } = await req.json();

    if (!id || !url) {
      return NextResponse.json(
        { success: false, error: 'Missing id or url' },
        { status: 400 }
      );
    }

    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { data: existingDoc, error: checkError } = await authResult.supabase
      .from('documents')
      .select('id, employee_id, url')
      .eq('id', id.toString())
      .maybeSingle();

    if (checkError || !existingDoc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const pathAllowed = await verifyDocumentPathAccess(authResult.supabase, String(url));
    if (!pathAllowed || existingDoc.url !== url) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { error: storageError } = await supabaseAdmin.storage.from('documents').remove([url]);
    if (storageError) {
      return NextResponse.json({ success: false, error: storageError.message }, { status: 500 });
    }

    const { data: dbData, error: dbError } = await authResult.supabase
      .from('documents')
      .delete()
      .eq('id', id.toString())
      .select();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: dbData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
