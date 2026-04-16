import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { verifyCvDocumentAccess } from '@/lib/cv/verifyCvAccess';
import { isValidCvPhotoStoragePath } from '@/lib/cv/photoPath';

export const dynamic = 'force-dynamic';

const SIGNED_TTL_SEC = 3600;

export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get('employeeId');
  const cvId = req.nextUrl.searchParams.get('cvId');
  const path = req.nextUrl.searchParams.get('path');

  if (!employeeId || !cvId || !path) {
    return NextResponse.json({ error: 'employeeId, cvId, and path required' }, { status: 400 });
  }

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

  if (!isValidCvPhotoStoragePath(employeeId, cvId, path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const ok = await verifyCvDocumentAccess(auth, employeeId, cvId);
  if (!ok) {
    return NextResponse.json({ error: 'CV not found or access denied' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('cv-photos')
    .createSignedUrl(path, SIGNED_TTL_SEC);

  if (error || !data?.signedUrl) {
    console.error('cv-photo sign', error);
    return NextResponse.json({ error: error?.message ?? 'Sign failed' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: SIGNED_TTL_SEC });
}
