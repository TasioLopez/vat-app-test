import type { SupabaseClient } from '@supabase/supabase-js';
import type { MeetingCapture, NotesOrigin, TranscriptSource } from '@/lib/meetings/audio';

const CAPTURE_COLUMNS =
  'id, employee_id, created_by, status, audio_path, transcript_text, transcript_original_text, transcript_source, notes_text, notes_origin, notes_document_id, consent_at, created_at, updated_at';

type CaptureListResult = {
  data: MeetingCapture[] | null;
  error: { message: string } | null;
};

type CaptureBuilder = PromiseLike<CaptureListResult> & {
  select: (columns: string) => CaptureBuilder;
  insert: (row: Record<string, unknown>) => CaptureBuilder;
  update: (row: Record<string, unknown>) => CaptureBuilder;
  delete: () => CaptureBuilder;
  eq: (column: string, value: string) => CaptureBuilder;
  neq: (column: string, value: string) => CaptureBuilder;
  order: (column: string, options: { ascending: boolean }) => CaptureBuilder;
  maybeSingle: () => Promise<{
    data: MeetingCapture | null;
    error: { message: string } | null;
  }>;
  single: () => Promise<{
    data: MeetingCapture | null;
    error: { message: string } | null;
  }>;
};

function table(supabase: SupabaseClient): CaptureBuilder {
  return (supabase as unknown as { from: (table: string) => CaptureBuilder }).from('meeting_captures');
}

export async function listMeetingCaptures(
  supabase: SupabaseClient,
  employeeId: string
): Promise<{ data: MeetingCapture[]; error: string | null }> {
  const { data, error } = await table(supabase)
    .select(CAPTURE_COLUMNS)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as MeetingCapture[], error: null };
}

export async function getMeetingCapture(
  supabase: SupabaseClient,
  employeeId: string,
  captureId: string
): Promise<{ data: MeetingCapture | null; error: string | null }> {
  const { data, error } = await table(supabase)
    .select(CAPTURE_COLUMNS)
    .eq('id', captureId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function insertMeetingCapture(
  supabase: SupabaseClient,
  row: {
    employee_id: string;
    created_by: string;
    status: MeetingCapture['status'];
    transcript_text?: string | null;
    transcript_original_text?: string | null;
    transcript_source?: TranscriptSource | null;
    notes_text?: string | null;
    notes_origin?: NotesOrigin | null;
    consent_at?: string | null;
  }
): Promise<{ data: MeetingCapture | null; error: string | null }> {
  const { data, error } = await table(supabase)
    .insert(row)
    .select(CAPTURE_COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateMeetingCapture(
  supabase: SupabaseClient,
  employeeId: string,
  captureId: string,
  patch: Record<string, unknown>
): Promise<{ data: MeetingCapture | null; error: string | null }> {
  const { data, error } = await table(supabase)
    .update(patch)
    .eq('id', captureId)
    .eq('employee_id', employeeId)
    .select(CAPTURE_COLUMNS)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/** One published verslag per employee. Other accepted captures become drafts again. */
export async function clearOtherPublishedCaptures(
  supabase: SupabaseClient,
  employeeId: string,
  captureId: string
): Promise<{ error: string | null }> {
  const { error } = await table(supabase)
    .update({ status: 'notes_draft', notes_document_id: null })
    .eq('employee_id', employeeId)
    .eq('status', 'accepted')
    .neq('id', captureId);
  return { error: error?.message ?? null };
}

export async function deleteMeetingCapture(
  supabase: SupabaseClient,
  employeeId: string,
  captureId: string
): Promise<{ error: string | null }> {
  const { error } = await table(supabase)
    .delete()
    .eq('id', captureId)
    .eq('employee_id', employeeId);
  return { error: error?.message ?? null };
}
