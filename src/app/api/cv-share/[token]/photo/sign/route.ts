import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateGuestAccess } from '@/lib/cv-share/access';
import { CV_SHARE_SESSION_COOKIE } from '@/lib/cv-share/session';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { isValidCvPhotoStoragePath } from '@/lib/cv/photoPath';

export const dynamic = 'force-dynamic';

const SIGNED_TTL_SEC = 3600;

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CV_SHARE_SESSION_COOKIE)?.value;
  const access = await validateGuestAccess(token, sessionToken);
  if (!access) {
    return NextResponse.json({ error: 'Toegang geweigerd' }, { status: 403 });
  }

  const path = req.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }

  const { share } = access;
  if (!isValidCvPhotoStoragePath(share.employee_id, share.cv_document_id, path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('cv-photos')
    .createSignedUrl(path, SIGNED_TTL_SEC);

  if (error || !data?.signedUrl) {
    console.error('cv-share photo sign', error);
    return NextResponse.json({ error: error?.message ?? 'Sign failed' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: SIGNED_TTL_SEC });
}
