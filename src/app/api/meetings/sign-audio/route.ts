import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, isUuid } from '@/lib/auth/api-auth';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
import {
  MEETING_AUDIO_MAX_BYTES,
  isMeetingAudioExt,
  meetingAudioContentType,
  meetingAudioStoragePath,
} from '@/lib/meetings/audio';
import { getMeetingCapture, updateMeetingCapture } from '@/lib/meetings/captures';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const employeeId = (body?.employeeId ?? '').toString();
  const captureId = (body?.captureId ?? '').toString();
  const extension = (body?.extension ?? '').toString().toLowerCase();
  const sizeBytes = Number(body?.sizeBytes);

  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;
  if (!isUuid(captureId) || !isMeetingAudioExt(extension)) {
    return NextResponse.json({ error: 'Ongeldige opname' }, { status: 400 });
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MEETING_AUDIO_MAX_BYTES) {
    return NextResponse.json({ error: 'Opname is te groot (max 25 MB).' }, { status: 400 });
  }

  const existing = await getMeetingCapture(access.supabase, employeeId, captureId);
  if (existing.error) return NextResponse.json({ error: existing.error }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: 'Gesprek niet gevonden' }, { status: 404 });
  if (!existing.data.consent_at) {
    return NextResponse.json({ error: 'Toestemming voor opname ontbreekt.' }, { status: 400 });
  }

  const path = meetingAudioStoragePath(employeeId, captureId, extension);
  const contentType = meetingAudioContentType(extension);
  const { data, error } = await supabaseAdmin.storage
    .from('documents')
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Upload URL failed' }, { status: 500 });
  }

  const updated = await updateMeetingCapture(access.supabase, employeeId, captureId, {
    audio_path: path,
    status: existing.data.status === 'recorded' ? 'recorded' : existing.data.status,
  });
  if (updated.error) return NextResponse.json({ error: updated.error }, { status: 500 });

  return NextResponse.json({
    path: data.path,
    signedUrl: data.signedUrl,
    contentType,
  });
}
