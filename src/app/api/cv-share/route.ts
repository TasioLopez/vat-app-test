import { NextRequest, NextResponse } from 'next/server';
import { getAuthSupabase } from '@/lib/cv-share/auth-client';
import { verifyCvDocumentAccess } from '@/lib/cv/verifyCvAccess';
import {
  getActiveShareForCv,
  revokeActiveSharesForCv,
  shareExpiresAt,
} from '@/lib/cv-share/access';
import { generateShareToken, hashShareToken } from '@/lib/cv-share/tokens';
import { normalizeEmail } from '@/lib/cv-share/normalize-email';
import { sendCvShareEmail } from '@/lib/cv-share/email';
import { getBaseUrl } from '@/lib/cv-share/base-url';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = await getAuthSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const employeeId = req.nextUrl.searchParams.get('employeeId');
  const cvId = req.nextUrl.searchParams.get('cvId');
  if (!employeeId || !cvId) {
    return NextResponse.json({ error: 'employeeId and cvId required' }, { status: 400 });
  }

  const ok = await verifyCvDocumentAccess(supabase, employeeId, cvId);
  if (!ok) {
    return NextResponse.json({ error: 'CV not found or access denied' }, { status: 403 });
  }

  const share = await getActiveShareForCv(supabase, cvId, employeeId);
  if (!share) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    share: {
      id: share.id,
      recipientEmail: share.recipient_email,
      expiresAt: share.expires_at,
      lastAccessedAt: share.last_accessed_at,
      lastSavedAt: share.last_saved_at,
      createdAt: share.created_at,
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await getAuthSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { employeeId?: string; cvId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { employeeId, cvId, message } = body;
  if (!employeeId || !cvId) {
    return NextResponse.json({ error: 'employeeId and cvId required' }, { status: 400 });
  }

  const ok = await verifyCvDocumentAccess(supabase, employeeId, cvId);
  if (!ok) {
    return NextResponse.json({ error: 'CV not found or access denied' }, { status: 403 });
  }

  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('first_name, last_name, email')
    .eq('id', employeeId)
    .maybeSingle();

  if (empErr || !emp) {
    return NextResponse.json({ error: 'Werknemer niet gevonden' }, { status: 404 });
  }

  const recipientEmail = emp.email ? normalizeEmail(emp.email) : '';
  if (!recipientEmail) {
    return NextResponse.json(
      { error: 'Werknemer heeft geen e-mailadres. Voeg een e-mailadres toe aan het werknemerprofiel.' },
      { status: 400 }
    );
  }

  const { data: advisor } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const advisorName =
    [advisor?.first_name, advisor?.last_name].filter(Boolean).join(' ') ||
    advisor?.email ||
    'Uw adviseur';
  const employeeName =
    [emp.first_name, emp.last_name].filter(Boolean).join(' ') || 'werknemer';

  await revokeActiveSharesForCv(cvId);

  const rawToken = generateShareToken();
  const expiresAt = shareExpiresAt();
  const expiresAtIso = expiresAt.toISOString();

  const { data: share, error: insertErr } = await supabase
    .from('cv_share_links')
    .insert({
      cv_document_id: cvId,
      employee_id: employeeId,
      token_hash: hashShareToken(rawToken),
      recipient_email: recipientEmail,
      created_by: user.id,
      message: message?.trim() || null,
      expires_at: expiresAtIso,
    })
    .select('id')
    .single();

  if (insertErr || !share) {
    console.error('cv-share insert', insertErr);
    return NextResponse.json({ error: 'Delen mislukt' }, { status: 500 });
  }

  await supabase
    .from('cv_documents')
    .update({ status: 'shared_for_review' })
    .eq('id', cvId)
    .eq('employee_id', employeeId);

  const base = getBaseUrl(req);
  const shareUrl = `${base}/cv/share/${rawToken}`;

  try {
    await sendCvShareEmail({
      to: recipientEmail,
      shareUrl,
      employeeName,
      advisorName,
      message: message?.trim() || null,
      expiresAt,
    });
  } catch (emailErr) {
    console.error('cv-share email', emailErr);
    await supabase.from('cv_share_links').update({ revoked_at: new Date().toISOString() }).eq('id', share.id);
    return NextResponse.json(
      { error: 'E-mail versturen mislukt. Controleer SMTP-instellingen.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    shareUrl,
    expiresAt: expiresAtIso,
    recipientEmail,
  });
}
