export const MEETING_AUDIO_MAX_BYTES = 25 * 1024 * 1024;

export const MEETING_CAPTURE_STATUSES = [
  'recorded',
  'transcribed',
  'notes_draft',
  'accepted',
] as const;

export type MeetingCaptureStatus = (typeof MEETING_CAPTURE_STATUSES)[number];

export type MeetingAudioExt = 'webm' | 'm4a' | 'mp4';

export const TRANSCRIPT_SOURCES = ['upload', 'paste', 'recording'] as const;
export type TranscriptSource = (typeof TRANSCRIPT_SOURCES)[number];

export const NOTES_ORIGINS = ['generated', 'pasted', 'uploaded'] as const;
export type NotesOrigin = (typeof NOTES_ORIGINS)[number];

export const MEETING_PURPOSES = ['intake', 'vgr', 'overig'] as const;
export type MeetingPurpose = (typeof MEETING_PURPOSES)[number];

export const MEETING_PURPOSE_LABELS: Record<MeetingPurpose, string> = {
  intake: 'Intake',
  vgr: 'VGR',
  overig: 'Overig',
};

/** Published document type for a purpose that can become a bron. */
export function documentTypeForPurpose(purpose: MeetingPurpose): string | null {
  if (purpose === 'intake') return 'gespreksverslag';
  if (purpose === 'vgr') return 'gespreksverslag_vgr';
  return null;
}

export function publishLabelForPurpose(purpose: MeetingPurpose): string | null {
  if (purpose === 'intake') return 'Gebruik als bron voor intake';
  if (purpose === 'vgr') return 'Gebruik als bron voor VGR';
  return null;
}

export function bronStepLabelForPurpose(purpose: MeetingPurpose): string {
  if (purpose === 'vgr') return 'Bron VGR';
  if (purpose === 'overig') return 'Bron';
  return 'Bron intake';
}

export type MeetingCapture = {
  id: string;
  employee_id: string;
  created_by: string | null;
  status: MeetingCaptureStatus;
  purpose: MeetingPurpose;
  audio_path: string | null;
  transcript_text: string | null;
  transcript_original_text: string | null;
  transcript_source: TranscriptSource | null;
  notes_text: string | null;
  notes_origin: NotesOrigin | null;
  notes_document_id: string | null;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
};

export function isTranscriptSource(value: unknown): value is TranscriptSource {
  return typeof value === 'string' && (TRANSCRIPT_SOURCES as readonly string[]).includes(value);
}

export function isNotesOrigin(value: unknown): value is NotesOrigin {
  return typeof value === 'string' && (NOTES_ORIGINS as readonly string[]).includes(value);
}

export function isMeetingPurpose(value: unknown): value is MeetingPurpose {
  return typeof value === 'string' && (MEETING_PURPOSES as readonly string[]).includes(value);
}

export function normalizeMeetingPurpose(value: unknown): MeetingPurpose {
  return isMeetingPurpose(value) ? value : 'intake';
}

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

/** A non-empty hand-written verslag is kept until the adviser replaces it. */
export function generateNotesDecision(
  notesOrigin: string | null | undefined,
  notesText: string | null | undefined,
  replace: boolean
): 'ok' | 'needs-replace' {
  const handWritten = notesOrigin === 'pasted' || notesOrigin === 'uploaded';
  if (handWritten && (notesText ?? '').trim() && !replace) return 'needs-replace';
  return 'ok';
}

/** Re-transcription must not wipe a transcript that is already stored. */
export function transcribeReplaceDecision(
  existingTranscript: string | null | undefined,
  replace: boolean
): 'ok' | 'needs-replace' {
  if ((existingTranscript ?? '').trim() && !replace) return 'needs-replace';
  return 'ok';
}

export function applyTranscriptWrite(params: {
  existingOriginal: string | null;
  nextText: string;
  source?: TranscriptSource | null;
}): {
  transcript_text: string;
  transcript_original_text?: string;
  transcript_source?: TranscriptSource;
} {
  const text = params.nextText.trim();
  const patch: {
    transcript_text: string;
    transcript_original_text?: string;
    transcript_source?: TranscriptSource;
  } = { transcript_text: text };
  if (!(params.existingOriginal ?? '').trim() && text) {
    patch.transcript_original_text = text;
  }
  if (params.source) patch.transcript_source = params.source;
  return patch;
}

export function restoreTranscriptText(
  original: string | null
): { ok: true; transcript_text: string } | { ok: false } {
  const text = (original ?? '').trim();
  if (!text) return { ok: false };
  return { ok: true, transcript_text: text };
}
