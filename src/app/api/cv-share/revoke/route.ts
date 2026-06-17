import { NextRequest, NextResponse } from 'next/server';
import { getAuthSupabase } from '@/lib/cv-share/auth-client';
import { verifyCvDocumentAccess } from '@/lib/cv/verifyCvAccess';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await getAuthSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { shareId?: string; cvId?: string; employeeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { shareId, cvId, employeeId } = body;

  if (shareId) {
    const { data: share, error } = await supabase
      .from('cv_share_links')
      .select('id, cv_document_id, employee_id')
      .eq('id', shareId)
      .maybeSingle();

    if (error || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('cv_share_links')
      .update({ revoked_at: now })
      .eq('id', shareId);

    if (updErr) {
      return NextResponse.json({ error: 'Intrekken mislukt' }, { status: 500 });
    }

    await supabaseAdmin
      .from('cv_documents')
      .update({ status: 'draft' })
      .eq('id', share.cv_document_id)
      .eq('employee_id', share.employee_id);

    return NextResponse.json({ success: true });
  }

  if (!cvId || !employeeId) {
    return NextResponse.json({ error: 'shareId or cvId+employeeId required' }, { status: 400 });
  }

  const ok = await verifyCvDocumentAccess(supabase, employeeId, cvId);
  if (!ok) {
    return NextResponse.json({ error: 'CV not found or access denied' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('cv_share_links')
    .update({ revoked_at: now })
    .eq('cv_document_id', cvId)
    .eq('employee_id', employeeId)
    .is('revoked_at', null);

  if (updErr) {
    return NextResponse.json({ error: 'Intrekken mislukt' }, { status: 500 });
  }

  await supabaseAdmin
    .from('cv_documents')
    .update({ status: 'draft' })
    .eq('id', cvId)
    .eq('employee_id', employeeId);

  return NextResponse.json({ success: true });
}
