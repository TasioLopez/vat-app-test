import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import {
  buildDocumentStoragePath,
  DOCUMENT_MAX_BYTES,
  isAllowedDocumentMime,
  sanitizeDocumentFileName,
} from '@/lib/documents/upload-validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get('file');
    const employeeId = formData.get('employee_id');
    const type = formData.get('type');
    const name = formData.get('name');

    if (!(file instanceof File) || typeof employeeId !== 'string' || typeof type !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const authResult = await requireEmployeeAccess(employeeId);
    if (isAuthError(authResult)) return authResult;

    if (!isAllowedDocumentMime(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const safeName = sanitizeDocumentFileName(name);
    if (!safeName) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > DOCUMENT_MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const filePath = buildDocumentStoragePath(employeeId, type, safeName);

    const { error } = await supabaseAdmin.storage.from('documents').upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: filePath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('Upload failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
