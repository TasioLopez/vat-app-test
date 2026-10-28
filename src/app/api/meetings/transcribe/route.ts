import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
import { isAuthError, isUuid } from '@/lib/auth/api-auth';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
import { MEETING_AUDIO_MAX_BYTES, meetingAudioContentType, type MeetingAudioExt } from '@/lib/meetings/audio';
import { getMeetingCapture, updateMeetingCapture } from '@/lib/meetings/captures';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function audioExt(path: string): MeetingAudioExt {
  if (path.endsWith('.m4a')) return 'm4a';
  if (path.endsWith('.mp4')) return 'mp4';
  return 'webm';
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const employeeId = (body?.employeeId ?? '').toString();
  const captureId = (body?.captureId ?? '').toString();
  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;
  if (!isUuid(captureId)) return NextResponse.json({ error: 'Ongeldig gesprek' }, { status: 400 });

  const existing = await getMeetingCapture(access.supabase, employeeId, captureId);
  if (existing.error) return NextResponse.json({ error: existing.error }, { status: 500 });
  if (!existing.data?.audio_path) {
    return NextResponse.json({ error: 'Geen opname gevonden.' }, { status: 400 });
  }

  const { data: file, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(existing.data.audio_path);
  if (downloadError || !file) {
    return NextResponse.json({ error: downloadError?.message || 'Opname lezen mislukt' }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MEETING_AUDIO_MAX_BYTES) {
    return NextResponse.json({ error: 'Opname is te groot (max 25 MB).' }, { status: 400 });
  }

  const ext = audioExt(existing.data.audio_path);
  const upload = await toFile(buffer, `gesprek.${ext}`, { type: meetingAudioContentType(ext) });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const transcript = await openai.audio.transcriptions.create({
    file: upload,
    model: 'gpt-transcribe',
    response_format: 'json',
    prompt:
      'Nederlands gesprek tussen loopbaanadviseur en werknemer over werk, opleiding en belastbaarheid.',
    // gpt-transcribe expects `languages`, not the older singular `language` field.
    languages: ['nl'],
  } as OpenAI.Audio.TranscriptionCreateParamsNonStreaming);

  const transcriptText = 'text' in transcript ? transcript.text : String(transcript);
  const text = transcriptText.trim();
  if (!text) return NextResponse.json({ error: 'Leeg transcript' }, { status: 502 });

  const updated = await updateMeetingCapture(access.supabase, employeeId, captureId, {
    transcript_text: text,
    status: 'transcribed',
  });
  if (updated.error || !updated.data) {
    return NextResponse.json({ error: updated.error || 'Transcript opslaan mislukt' }, { status: 500 });
  }
  return NextResponse.json({ capture: updated.data, transcriptText: text });
}
