import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runAssistantExtraction } from './runAssistantExtraction';
import { extractStoragePath, INTAKE_TYPE_VARIANTS } from './storage';

export type IntakeDocumentFile = {
  buffer: Buffer;
  path: string;
  /** Original filename for OpenAI naming when path lacks extension. */
  displayName?: string;
};

export async function getIntakeDocumentForEmployee(
  supabase: SupabaseClient,
  employeeId: string
): Promise<IntakeDocumentFile | null> {
  const { data: docs } = await supabase
    .from('documents')
    .select('type, url, name, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  if (!docs?.length) return null;

  for (const variant of INTAKE_TYPE_VARIANTS) {
    const hit = docs.find((d) => (d.type || '').toLowerCase().includes(variant));
    if (!hit?.url) continue;

    const path = extractStoragePath(hit.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      buffer,
      path,
      displayName: hit.name ?? undefined,
    };
  }

  return null;
}

/** Run file_search on intake with custom instructions; returns assistant text. */
export async function runIntakeAssistantText(
  openai: OpenAI,
  supabase: SupabaseClient,
  employeeId: string,
  instructions: string,
  userMessage: string
): Promise<string> {
  const doc = await getIntakeDocumentForEmployee(supabase, employeeId);
  if (!doc) return '';

  const { rawText } = await runAssistantExtraction(openai, {
    buffer: doc.buffer,
    storagePath: doc.path,
    fallbackName: doc.displayName || doc.path,
    assistantName: 'Intake Section Analyzer',
    instructions,
    userMessage,
  });
  return rawText;
}
