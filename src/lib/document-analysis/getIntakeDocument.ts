import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runAssistantExtraction } from './runAssistantExtraction';
import { extractStoragePath, getFileType, INTAKE_TYPE_VARIANTS } from './storage';

export type IntakeDocumentFile = {
  buffer: Buffer;
  fileName: string;
  mime: string;
  path: string;
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

    const fileType = getFileType(path, hit.name ?? undefined);
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = fileType.ext === 'docm' ? 'docm' : fileType.ext;
    return {
      buffer,
      fileName: `intake.${ext}`,
      mime: fileType.mime,
      path,
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
    fileName: doc.fileName,
    mime: doc.mime,
    assistantName: 'Intake Section Analyzer',
    instructions,
    userMessage,
  });
  return rawText;
}
