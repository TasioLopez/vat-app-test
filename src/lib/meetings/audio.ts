export const MEETING_AUDIO_MAX_BYTES = 25 * 1024 * 1024;

export const MEETING_CAPTURE_STATUSES = [
  'recorded',
  'transcribed',
  'notes_draft',
  'accepted',
] as const;

export type MeetingCaptureStatus = (typeof MEETING_CAPTURE_STATUSES)[number];

export type MeetingAudioExt = 'webm' | 'm4a' | 'mp4';

export type MeetingCapture = {
  id: string;
  employee_id: string;
  created_by: string | null;
  status: MeetingCaptureStatus;
  audio_path: string | null;
  transcript_text: string | null;
  notes_text: string | null;
  notes_document_id: string | null;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
};

export function isMeetingAudioExt(value: string): value is MeetingAudioExt {
  return value === 'webm' || value === 'm4a' || value === 'mp4';
}

export function meetingAudioExtension(mime: string): MeetingAudioExt {
  const normalized = mime.toLowerCase();
  if (normalized.includes('mp4') || normalized.includes('m4a') || normalized.includes('aac')) {
    return 'm4a';
  }
  return 'webm';
}

export function meetingAudioContentType(ext: MeetingAudioExt): string {
  return ext === 'webm' ? 'audio/webm' : 'audio/mp4';
}

export function meetingAudioStoragePath(
  employeeId: string,
  captureId: string,
  ext: MeetingAudioExt
): string {
  return `${employeeId}/meeting-audio/${captureId}.${ext}`;
}

/** Uploaded note wins until the adviser explicitly replaces it. */
export function acceptNotesDecision(
  hasExistingDocument: boolean,
  replace: boolean
): 'ok' | 'needs-replace' {
  if (hasExistingDocument && !replace) return 'needs-replace';
  return 'ok';
}
