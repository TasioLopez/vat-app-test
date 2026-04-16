import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { verifyCvDocumentAccess } from '@/lib/cv/verifyCvAccess';
import { isValidCvPhotoStoragePath } from '@/lib/cv/photoPath';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { employeeId?: string; cvId?: string; path?: string };
  try {
    body = (await req.json()) as { employeeId?: string; cvId?: string; path?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { employeeId, cvId, path } = body;
  if (!employeeId || !cvId || !path) {
    return NextResponse.json({ error: 'employeeId, cvId, and path required' }, { status: 400 });
  }

  if (!isValidCvPhotoStoragePath(employeeId, cvId, path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const ok = await verifyCvDocumentAccess(auth, employeeId, cvId);
  if (!ok) {
    return NextResponse.json({ error: 'CV not found or access denied' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.storage.from('cv-photos').remove([path]);
  if (error) {
    console.error('cv-photo delete', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
