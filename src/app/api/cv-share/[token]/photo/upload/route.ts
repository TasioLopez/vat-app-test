import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateGuestAccess } from '@/lib/cv-share/access';
import { CV_SHARE_SESSION_COOKIE } from '@/lib/cv-share/session';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import {
  CV_PHOTO_MAX_BYTES,
  isAllowedCvPhotoMime,
  isValidCvPhotoStoragePath,
} from '@/lib/cv/photoPath';
import { verifyImageMagicBytes } from '@/lib/cv/verifyImageMime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CV_SHARE_SESSION_COOKIE)?.value;
  const access = await validateGuestAccess(token, sessionToken);
  if (!access) {
    return NextResponse.json({ error: 'Toegang geweigerd' }, { status: 403 });
  }

  const { share } = access;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  if (!isAllowedCvPhotoMime(file.type)) {
    return NextResponse.json({ error: 'Alleen JPEG, PNG of WebP toegestaan' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > CV_PHOTO_MAX_BYTES) {
    return NextResponse.json({ error: 'Bestand te groot (max. 5 MB)' }, { status: 400 });
  }

  if (!(await verifyImageMagicBytes(buf, file.type))) {
    return NextResponse.json({ error: 'Bestandstype komt niet overeen met inhoud' }, { status: 400 });
  }

  const ext =
    file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const objectName = `${crypto.randomUUID()}.${ext}`;
  const path = `${share.employee_id}/${share.cv_document_id}/${objectName}`;

  if (!isValidCvPhotoStoragePath(share.employee_id, share.cv_document_id, path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 500 });
  }

  const { error: upErr } = await supabaseAdmin.storage.from('cv-photos').upload(path, buf, {
    contentType: file.type,
    upsert: true,
  });

  if (upErr) {
    console.error('cv-share photo upload', upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, path });
}
