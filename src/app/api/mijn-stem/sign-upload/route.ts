import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/api-auth';
import { prepareMijnStemSignedUpload } from '@/lib/mijn-stem/prepare-signed-upload';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await req.json().catch(() => ({}));
    const name = (body?.name ?? '').toString();
    const contentType = (body?.content_type ?? '').toString();
    const sizeBytes = Number(body?.size_bytes);

    const prepared = prepareMijnStemSignedUpload({
      userId: authResult.user.id,
      originalName: name,
      contentType,
      sizeBytes,
    });

    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    }

    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUploadUrl(prepared.path, { upsert: true });

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Upload URL failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      path: data.path,
      signedUrl: data.signedUrl,
      token: data.token,
      content_type: prepared.contentType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('Mijn Stem sign upload failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
