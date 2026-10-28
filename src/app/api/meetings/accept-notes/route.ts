import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, isUuid } from '@/lib/auth/api-auth';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
import { getMeetingCapture, updateMeetingCapture } from '@/lib/meetings/captures';
import { saveGespreksverslagDocument } from '@/lib/meetings/save-document';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const employeeId = (body?.employeeId ?? '').toString();
  const captureId = (body?.captureId ?? '').toString();
  const notesText = typeof body?.notesText === 'string' ? body.notesText : '';
  const replace = body?.replace === true;

  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;
  if (!isUuid(captureId)) return NextResponse.json({ error: 'Ongeldig gesprek' }, { status: 400 });
  if (!notesText.trim()) {
    return NextResponse.json({ error: 'Het verslag is leeg.' }, { status: 400 });
  }

  const existing = await getMeetingCapture(access.supabase, employeeId, captureId);
  if (existing.error) return NextResponse.json({ error: existing.error }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: 'Gesprek niet gevonden' }, { status: 404 });

  const saved = await saveGespreksverslagDocument({
    supabase: access.supabase,
    employeeId,
    notesText,
    replace,
  });
  if (!saved.ok && 'needsReplace' in saved) {
    return NextResponse.json(
      {
        error: 'Er staat al een gespreksverslag. Vervang het expliciet.',
        needsReplace: true,
      },
      { status: 409 }
    );
  }
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 500 });

  const updated = await updateMeetingCapture(access.supabase, employeeId, captureId, {
    notes_text: notesText.trim(),
    notes_document_id: saved.documentId,
    status: 'accepted',
  });
  if (updated.error || !updated.data) {
    return NextResponse.json({ error: updated.error || 'Verslag koppelen mislukt' }, { status: 500 });
  }
  return NextResponse.json({ capture: updated.data, documentId: saved.documentId });
}
