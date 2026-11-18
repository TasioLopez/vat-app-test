import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isStagingEnv } from '@/lib/auth/staging-only';
import { loadWorkerFacts } from '@/lib/employee/save-worker-facts';
import { importIntakeFromPdf } from '@/lib/intake/import-from-pdf';
import { generateIntakeFromDossier } from '@/lib/intake/generate-from-dossier';
import { mergeIntakeFillBlanks } from '@/lib/intake/merge-extractions';
import { normalizeIntakeControlledFields } from '@/lib/intake/normalize-controlled-fields';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';
import { seedIntakeFromWorkerFacts } from '@/lib/intake/worker-overlay';

export type AutofillIntakeResult = {
  data: IntakeData;
  sourceDocumentId: string | null;
  error?: string;
  warning?: string | null;
  gapFilled: boolean;
  /** Staging: the form was built from dossier documents because no intake PDF exists. */
  generatedFromDossier?: boolean;
  workerFacts?: Record<string, unknown>;
};

/**
 * Intake-first autofill: seed from WorkerFacts, import from intake PDF for gaps,
 * then blank-only gap-fill from dossier docs. Known worker values always win for shared keys.
 */
export async function autofillIntakeFromDocuments(params: {
  openai: OpenAI;
  supabase: SupabaseClient;
  employeeId: string;
}): Promise<AutofillIntakeResult> {
  const { openai, supabase, employeeId } = params;

  const loaded = await loadWorkerFacts(supabase, employeeId);
  const workerFacts = loaded.snapshot?.values ?? {};

  const imported = await importIntakeFromPdf({
    openai,
    supabase,
    employeeId,
    // Fresh base — document truth for this run (draft snapshotted client-side for undo).
  });

  if (imported.error && !imported.sourceDocumentId) {
    if (isStagingEnv()) {
      try {
        const dossier = await generateIntakeFromDossier({ openai, supabase, employeeId });
        if (!dossier.error) {
          const data = seedIntakeFromWorkerFacts(
            normalizeIntakeControlledFields(ensureIntakeShape(dossier.data)),
            workerFacts
          );
          data.meta.generation_notes = [
            'Intake gegenereerd vanuit dossierdocumenten (geen intakeformulier).',
            ...data.meta.generation_notes,
          ];
          return {
            data,
            sourceDocumentId: null,
            warning: null,
            gapFilled: false,
            generatedFromDossier: true,
            workerFacts,
          };
        }
      } catch (e) {
        console.warn('Staging dossier-only intake generate failed', e);
      }
    }
    return {
      data: seedIntakeFromWorkerFacts(ensureIntakeShape(imported.data), workerFacts),
      sourceDocumentId: null,
      error: imported.error,
      gapFilled: false,
      workerFacts,
    };
  }

  // Known worker facts win over PDF extraction for shared keys; extraction fills the rest.
  let data = seedIntakeFromWorkerFacts(ensureIntakeShape(imported.data), workerFacts);
  let gapFilled = false;
  let warning: string | null = imported.error || null;

  try {
    const dossier = await generateIntakeFromDossier({ openai, supabase, employeeId });
    if (!dossier.error) {
      data = seedIntakeFromWorkerFacts(mergeIntakeFillBlanks(data, dossier.data), workerFacts);
      gapFilled = true;
      data.meta.generation_notes = [
        ...data.meta.generation_notes,
        'Aangevuld vanuit dossierdocumenten (alleen lege velden).',
      ];
    } else if (dossier.data.meta.generation_notes.length > 0) {
      data = seedIntakeFromWorkerFacts(mergeIntakeFillBlanks(data, dossier.data), workerFacts);
      gapFilled = true;
      warning = warning || dossier.error;
      data.meta.generation_notes = [
        ...data.meta.generation_notes,
        'Aangevuld vanuit dossierdocumenten (alleen lege velden).',
      ];
    } else {
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
    data: normalizeIntakeControlledFields(ensureIntakeShape(data)),
    sourceDocumentId: imported.sourceDocumentId,
    warning,
    gapFilled,
    workerFacts,
  };
}
