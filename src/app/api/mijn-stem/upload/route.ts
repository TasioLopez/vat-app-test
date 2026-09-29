import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/api-auth';
import {
  isOwnedMijnStemStoragePath,
  MIJN_STEM_MAX_BYTES,
  resolveMijnStemMime,
} from '@/lib/mijn-stem/prepare-signed-upload';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await req.json().catch(() => ({}));
    const storagePath = (body?.storage_path ?? '').toString().trim();
    const filename = (body?.filename ?? '').toString().trim();
    const fileSize = Number(body?.file_size);
    const fileType = (body?.file_type ?? '').toString().trim();

    if (!storagePath || !filename) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!isOwnedMijnStemStoragePath(authResult.user.id, storagePath)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!Number.isFinite(fileSize) || fileSize < 0 || fileSize > MIJN_STEM_MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const resolvedMime = resolveMijnStemMime(fileType, filename);
    if (!resolvedMime) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const { data: insertData, error: insertError } = await authResult.supabase
      .from('mijn_stem_documents')
      .insert({
        user_id: authResult.user.id,
        filename,
        storage_path: storagePath,
        file_size: fileSize,
        file_type: resolvedMime,
        status: 'uploaded',
      })
      .select()
      .single();

    if (insertError) {
      await supabaseAdmin.storage.from('documents').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: insertData,
      message: 'File uploaded successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { data: documents, error } = await authResult.supabase
      .from('mijn_stem_documents')
      .select('*')
      .eq('user_id', authResult.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({ success: true, documents: documents || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
