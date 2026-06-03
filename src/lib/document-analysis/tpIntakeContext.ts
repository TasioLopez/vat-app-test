import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runIntakeAssistantText } from './getIntakeDocument';
import { INTAKE_LAYOUT_V75_HINT } from './prompts/intake-layout-v75';

const MAX_CONTEXT_CHARS = 22_000;

/**
 * Load intake document via file_search and return model-generated context text for TP section writers.
 */
export async function getIntakeContextForTp(
  openai: OpenAI,
  supabase: SupabaseClient,
  employeeId: string,
  focusInstructions: string
): Promise<string> {
  const instructions = `${INTAKE_LAYOUT_V75_HINT}

${focusInstructions}

Geef een duidelijke Nederlandse tekstsamenvatting of relevante citaten uit het document. Geen JSON.`;

  const text = await runIntakeAssistantText(
    openai,
    supabase,
    employeeId,
    instructions,
    'Lees het intakeformulier via file_search en geef de gevraagde informatie.'
  );

  const cleaned = text.replace(/【[^】]+】/g, '').replace(/\[\d+:\d+[^\]]*\]/g, '').trim();
  if (!cleaned || cleaned.length < 50) return '';
  return cleaned.length > MAX_CONTEXT_CHARS ? `${cleaned.slice(0, MAX_CONTEXT_CHARS)}…` : cleaned;
}
