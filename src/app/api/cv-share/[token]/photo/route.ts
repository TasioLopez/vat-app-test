import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateGuestAccess } from '@/lib/cv-share/access';
import { CV_SHARE_SESSION_COOKIE } from '@/lib/cv-share/session';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { isValidCvPhotoStoragePath } from '@/lib/cv/photoPath';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CV_SHARE_SESSION_COOKIE)?.value;
  const access = await validateGuestAccess(token, sessionToken);
  if (!access) {
    return NextResponse.json({ error: 'Toegang geweigerd' }, { status: 403 });
  }

  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { path } = body;
  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }

  const { share } = access;
  if (!isValidCvPhotoStoragePath(share.employee_id, share.cv_document_id, path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.storage.from('cv-photos').remove([path]);
  if (error) {
    console.error('cv-share photo delete', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
