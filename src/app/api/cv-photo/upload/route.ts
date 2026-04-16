import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { verifyCvDocumentAccess } from '@/lib/cv/verifyCvAccess';
import {
  CV_PHOTO_MAX_BYTES,
  isAllowedCvPhotoMime,
  isValidCvPhotoStoragePath,
} from '@/lib/cv/photoPath';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const employeeId = formData.get('employeeId');
  const cvId = formData.get('cvId');

  if (!(file instanceof File) || typeof employeeId !== 'string' || typeof cvId !== 'string') {
    return NextResponse.json({ error: 'Missing file, employeeId, or cvId' }, { status: 400 });
  }

  const ok = await verifyCvDocumentAccess(auth, employeeId, cvId);
  if (!ok) {
    return NextResponse.json({ error: 'CV not found or access denied' }, { status: 403 });
  }

  if (!isAllowedCvPhotoMime(file.type)) {
    return NextResponse.json({ error: 'Alleen JPEG, PNG of WebP toegestaan' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > CV_PHOTO_MAX_BYTES) {
    return NextResponse.json({ error: 'Bestand te groot (max. 5 MB)' }, { status: 400 });
  }

  const ext =
    file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const objectName = `${crypto.randomUUID()}.${ext}`;
  const path = `${employeeId}/${cvId}/${objectName}`;

  if (!isValidCvPhotoStoragePath(employeeId, cvId, path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 500 });
  }

  const { error: upErr } = await supabaseAdmin.storage.from('cv-photos').upload(path, buf, {
    contentType: file.type,
    upsert: true,
  });

  if (upErr) {
    console.error('cv-photo upload', upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, path });
}
