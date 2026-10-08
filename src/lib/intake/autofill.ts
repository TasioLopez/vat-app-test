import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { importIntakeFromPdf } from '@/lib/intake/import-from-pdf';
import { generateIntakeFromDossier } from '@/lib/intake/generate-from-dossier';
import { mergeIntakeFillBlanks } from '@/lib/intake/merge-extractions';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';

export type AutofillIntakeResult = {
  data: IntakeData;
  sourceDocumentId: string | null;
  error?: string;
  warning?: string | null;
  gapFilled: boolean;
};

/**
 * Intake-first autofill: import from intake PDF, then blank-only gap-fill from dossier docs.
 */
export async function autofillIntakeFromDocuments(params: {
  openai: OpenAI;
  supabase: SupabaseClient;
  employeeId: string;
}): Promise<AutofillIntakeResult> {
  const { openai, supabase, employeeId } = params;

  const imported = await importIntakeFromPdf({
    openai,
    supabase,
    employeeId,
    // Fresh base — document truth for this run (draft snapshotted client-side for undo).
  });

  if (imported.error && !imported.sourceDocumentId) {
    return {
      data: ensureIntakeShape(imported.data),
      sourceDocumentId: null,
      error: imported.error,
      gapFilled: false,
    };
  }

  let data = ensureIntakeShape(imported.data);
  let gapFilled = false;
  let warning: string | null = imported.error || null;

  try {
    const dossier = await generateIntakeFromDossier({ openai, supabase, employeeId });
    if (!dossier.error) {
      data = mergeIntakeFillBlanks(data, dossier.data);
      gapFilled = true;
      data.meta.generation_notes = [
        ...data.meta.generation_notes,
        'Aangevuld vanuit dossierdocumenten (alleen lege velden).',
      ];
    } else if (dossier.data.meta.generation_notes.length > 0) {
      // Partial generate — still merge what we got.
      data = mergeIntakeFillBlanks(data, dossier.data);
      gapFilled = true;
      warning = warning || dossier.error;
      data.meta.generation_notes = [
        ...data.meta.generation_notes,
        'Aangevuld vanuit dossierdocumenten (alleen lege velden).',
      ];
    } else {
      // No dossier docs — intake-only is fine.
      data.meta.generation_notes = [
        ...data.meta.generation_notes,
        'Geen dossierdocumenten voor aanvulling; alleen intakeformulier gebruikt.',
      ];
    }
  } catch (e) {
    console.warn('Intake autofill dossier gap-fill failed', e);
    warning =
      warning ||
      (e instanceof Error ? e.message : 'Dossier-aanvulling mislukt; intakeresultaat behouden.');
  }

  if (!data.meta.generation_notes.some((n) => n.includes('Intake automatisch ingevuld'))) {
    data.meta.generation_notes = [
      'Intake automatisch ingevuld (intakeformulier + eventuele dossier-aanvulling).',
      ...data.meta.generation_notes,
    ];
  }

  return {
    data: ensureIntakeShape(data),
    sourceDocumentId: imported.sourceDocumentId,
    warning,
    gapFilled,
  };
}
