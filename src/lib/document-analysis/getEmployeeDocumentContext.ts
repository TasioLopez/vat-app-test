import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runDocumentTextExtraction } from './runStructuredExtraction';
import { extractStoragePath } from './storage';
import { stripAssistantArtifacts } from './stripAssistantArtifacts';

const MAX_CONTEXT_CHARS = 22_000;

/**
 * Find newest employee document matching any type substring and return document context text.
 */
export async function getEmployeeDocumentContext(
  openai: OpenAI,
  supabase: SupabaseClient,
  employeeId: string,
  typeMatchers: string[],
  focusInstructions: string,
  userMessage = 'Lees het document en geef de gevraagde informatie.'
): Promise<string> {
  const { data: docs } = await supabase
    .from('documents')
    .select('type, url, name, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  if (!docs?.length) return '';

  for (const matcher of typeMatchers) {
    const hit = docs.find((d) => (d.type || '').toLowerCase().includes(matcher.toLowerCase()));
    if (!hit?.url) continue;

    const path = extractStoragePath(hit.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const fallbackName = hit.name || `${hit.type || 'document'}`;

    const rawText = await runDocumentTextExtraction({
      openai,
      buffer,
      storagePath: path,
      fallbackName,
      instructions: focusInstructions,
      userMessage,
    });

    const cleaned = stripAssistantArtifacts(rawText);
    if (cleaned.length >= 50) {
      return cleaned.length > MAX_CONTEXT_CHARS ? `${cleaned.slice(0, MAX_CONTEXT_CHARS)}…` : cleaned;
    }
  }

  return '';
}
