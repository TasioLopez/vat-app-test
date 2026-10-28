import type { SupabaseClient } from '@supabase/supabase-js';
import type { MeetingCapture } from '@/lib/meetings/audio';

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
    .select(
      'id, employee_id, created_by, status, audio_path, transcript_text, notes_text, notes_document_id, consent_at, created_at, updated_at'
    )
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
    .select(
      'id, employee_id, created_by, status, audio_path, transcript_text, notes_text, notes_document_id, consent_at, created_at, updated_at'
    )
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
    consent_at?: string | null;
  }
): Promise<{ data: MeetingCapture | null; error: string | null }> {
  const { data, error } = await table(supabase)
    .insert(row)
    .select(
      'id, employee_id, created_by, status, audio_path, transcript_text, notes_text, notes_document_id, consent_at, created_at, updated_at'
    )
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
    .select(
      'id, employee_id, created_by, status, audio_path, transcript_text, notes_text, notes_document_id, consent_at, created_at, updated_at'
    )
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
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
