import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/api-auth';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const userId = authResult.user.id;
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, '-');
    const fileName = `${userId}/mijn-stem-${timestamp}-${safeName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
    }

    const { data: insertData, error: insertError } = await authResult.supabase
      .from('mijn_stem_documents')
      .insert({
        user_id: userId,
        filename: file.name,
        storage_path: uploadData.path,
        file_size: file.size,
        file_type: file.type,
        status: 'uploaded',
      })
      .select()
      .single();

    if (insertError) {
      await supabaseAdmin.storage.from('documents').remove([uploadData.path]);
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
