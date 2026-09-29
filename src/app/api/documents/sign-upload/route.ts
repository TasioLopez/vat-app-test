import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { prepareEmployeeDocumentSignedUpload } from '@/lib/documents/prepare-signed-upload';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const employeeId = (body?.employee_id ?? '').toString();
    const type = (body?.type ?? '').toString();
    const name = (body?.name ?? '').toString();
    const contentType = (body?.content_type ?? '').toString();
    const sizeBytes = Number(body?.size_bytes);

    const authResult = await requireEmployeeAccess(employeeId);
    if (isAuthError(authResult)) return authResult;

    const prepared = prepareEmployeeDocumentSignedUpload({
      employeeId,
      type,
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('Sign upload failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
