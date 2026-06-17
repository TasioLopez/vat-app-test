import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  emailsMatch,
  getShareByRawToken,
  validateGuestAccess,
} from '@/lib/cv-share/access';
import { normalizeEmail } from '@/lib/cv-share/normalize-email';
import {
  buildShareSessionCookie,
  createShareSessionToken,
  CV_SHARE_SESSION_COOKIE,
} from '@/lib/cv-share/session';
import { checkVerifyRateLimit, resetVerifyRateLimit } from '@/lib/cv-share/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';

  const rate = checkVerifyRateLimit(ip);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'Te veel pogingen. Probeer het later opnieuw.' },
      { status: 429, headers: rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {} }
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email ? normalizeEmail(body.email) : '';
  if (!email) {
    return NextResponse.json({ error: 'E-mailadres is verplicht' }, { status: 400 });
  }

  const share = await getShareByRawToken(token);
  if (!share) {
    return NextResponse.json({ error: 'E-mailadres komt niet overeen' }, { status: 403 });
  }

  if (!emailsMatch(email, share.recipient_email)) {
    return NextResponse.json({ error: 'E-mailadres komt niet overeen' }, { status: 403 });
  }

  resetVerifyRateLimit(ip);

  const sessionToken = createShareSessionToken(
    {
      shareId: share.id,
      cvId: share.cv_document_id,
      employeeId: share.employee_id,
      email,
    },
    new Date(share.expires_at)
  );

  const maxAge = Math.min(
    7 * 24 * 60 * 60,
    Math.floor((new Date(share.expires_at).getTime() - Date.now()) / 1000)
  );

  await supabaseAdmin
    .from('cv_share_links')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', share.id);

  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', buildShareSessionCookie(sessionToken, Math.max(maxAge, 60)));
  return res;
}

/** Check if session already valid (for gate client). */
export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CV_SHARE_SESSION_COOKIE)?.value;
  const access = await validateGuestAccess(token, sessionToken);
  if (!access) {
    return NextResponse.json({ verified: false });
  }
  return NextResponse.json({ verified: true });
}
