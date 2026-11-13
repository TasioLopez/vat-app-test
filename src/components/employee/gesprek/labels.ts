import type {
  MeetingCaptureStatus,
  NotesOrigin,
  TranscriptSource,
} from '@/lib/meetings/audio';

export const STATUS_LABEL: Record<MeetingCaptureStatus, string> = {
  recorded: 'Opname',
  transcribed: 'Transcript',
  notes_draft: 'Concept',
  accepted: 'Bron voor intake',
};

export function sourceLabel(source: TranscriptSource | null): string | null {
  if (source === 'upload') return 'Geüpload';
  if (source === 'paste') return 'Geplakt';
  if (source === 'recording') return 'Opname';
  return null;
}

export function originLabel(origin: NotesOrigin | null): string | null {
  if (origin === 'generated') return 'Gemaakt uit transcript';
  if (origin === 'pasted') return 'Zelf geschreven';
  if (origin === 'uploaded') return 'Zelf aangeleverd';
  return null;
}

export function formatCaptureDate(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
