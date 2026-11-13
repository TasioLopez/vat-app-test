import type { SupabaseClient } from '@supabase/supabase-js';
import { buildDocumentStoragePath } from '@/lib/documents/upload-validation';
import {
  acceptNotesDecision,
  documentTypeForPurpose,
  type MeetingPurpose,
} from '@/lib/meetings/audio';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

const NOTES_FILE_NAMES: Record<string, string> = {
  gespreksverslag: 'gespreksverslag.txt',
  gespreksverslag_vgr: 'gespreksverslag-vgr.txt',
};

export type SaveGespreksverslagResult =
  | { ok: true; documentId: string }
  | { ok: false; needsReplace: true }
  | { ok: false; error: string };

export async function saveGespreksverslagDocument(params: {
  supabase: SupabaseClient;
  employeeId: string;
  notesText: string;
  replace: boolean;
  purpose: MeetingPurpose;
}): Promise<SaveGespreksverslagResult> {
  const notes = params.notesText.trim();
  if (!notes) return { ok: false, error: 'Leeg gespreksverslag' };

  const docType = documentTypeForPurpose(params.purpose);
  if (!docType) {
    return { ok: false, error: 'Dit doel publiceert geen bron.' };
  }

  const fileName = NOTES_FILE_NAMES[docType] ?? `${docType}.txt`;

  const { data: existing, error: existingError } = await params.supabase
    .from('documents')
    .select('id, url')
    .eq('employee_id', params.employeeId)
    .eq('type', docType)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };

  if (acceptNotesDecision(Boolean(existing), params.replace) === 'needs-replace') {
    return { ok: false, needsReplace: true };
  }

  const path = buildDocumentStoragePath(params.employeeId, docType, fileName);
  const body = Buffer.from(notes, 'utf8');
  const { error: uploadError } = await supabaseAdmin.storage.from('documents').upload(path, body, {
    contentType: 'text/plain; charset=utf-8',
    upsert: true,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  if (existing) {
    if (existing.url && existing.url !== path) {
      await supabaseAdmin.storage.from('documents').remove([existing.url]);
    }
    const { error: updateError } = await params.supabase
      .from('documents')
      .update({ name: fileName, url: path })
      .eq('id', existing.id)
      .eq('employee_id', params.employeeId);
    if (updateError) return { ok: false, error: updateError.message };
    return { ok: true, documentId: existing.id };
  }

  const { data: inserted, error: insertError } = await params.supabase
    .from('documents')
    .insert({
      employee_id: params.employeeId,
      type: docType,
      name: fileName,
      url: path,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message || 'Kon gespreksverslag niet opslaan' };
  }
  return { ok: true, documentId: inserted.id };
}
