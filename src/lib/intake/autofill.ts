import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isStagingEnv } from '@/lib/auth/staging-only';
import {
  INTAKE_AUTOFILL_STEPS_DOSSIER_ONLY,
  INTAKE_AUTOFILL_STEPS_WITH_PDF,
} from '@/lib/autofill-progress';
import {
  createStepProgressReporter,
  type AutofillProgressReporter,
} from '@/lib/autofill-progress-stream';
import { processEmployeeAutofillRawDetails } from '@/lib/employee/autofill-persist';
import { extractWorkerFactsFromDocuments } from '@/lib/employee/extract-worker-facts-from-documents';
import {
  loadWorkerFacts,
  saveWorkerFacts,
  type WorkerFactsSnapshot,
} from '@/lib/employee/save-worker-facts';
import { importIntakeFromPdf, type ImportIntakePhase } from '@/lib/intake/import-from-pdf';
import { generateIntakeFromDossier } from '@/lib/intake/generate-from-dossier';
import { mergeIntakeFillBlanks } from '@/lib/intake/merge-extractions';
import { normalizeIntakeControlledFields } from '@/lib/intake/normalize-controlled-fields';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';
import {
  seedIntakeFromWorkerFacts,
  validatedWorkerFactKeys,
} from '@/lib/intake/worker-overlay';

export type AutofillIntakeResult = {
  data: IntakeData;
  sourceDocumentId: string | null;
  error?: string;
  warning?: string | null;
  gapFilled: boolean;
  /** Staging: the form was built from dossier documents because no intake PDF exists. */
  generatedFromDossier?: boolean;
  workerFacts?: Record<string, unknown>;
  /** Last progress step is reserved for "opslaan" in the API route. */
  progressTotal: number;
};

const IMPORT_PHASE_STEP: Record<ImportIntakePhase, number> = {
  vision: 1,
  tp2: 2,
  narrative: 3,
  sectie3: 4,
  sectie5: 5,
  sectie7: 6,
};

function seedLockedThenFillGaps(
  raw: IntakeData,
  snapshot: WorkerFactsSnapshot | undefined,
  workerFacts: Record<string, unknown>
): IntakeData {
  const locked = snapshot ? validatedWorkerFactKeys(snapshot) : new Set<string>();
  // Locked facts always win; then fill remaining blanks from any known worker values
  // (without re-applying weak unvalidated Geen / no-license).
  const withLocks = seedIntakeFromWorkerFacts(raw, workerFacts, { onlyKeys: locked });
  return seedIntakeFromWorkerFacts(withLocks, workerFacts);
}

/**
 * Shared facts via the same chatlike path as worker/TP; intake PDF/dossier for narratives.
 * WorkerFacts overlay wins for shared keys after narrative merge.
 */
export async function autofillIntakeFromDocuments(params: {
  openai: OpenAI;
  supabase: SupabaseClient;
  employeeId: string;
  onProgress?: AutofillProgressReporter;
}): Promise<AutofillIntakeResult> {
  const { openai, supabase, employeeId, onProgress } = params;

  const withPdfSteps = [...INTAKE_AUTOFILL_STEPS_WITH_PDF];
  const reportPdf = createStepProgressReporter(withPdfSteps, onProgress);

  reportPdf(0);
  let loaded = await loadWorkerFacts(supabase, employeeId);
  let snapshot = loaded.snapshot;
  let workerFacts = snapshot?.values ?? {};
  let warning: string | null = null;

  // Same shared-fact extraction as worker profile Invullen / TP Stap 2 chatlike.
  try {
    const extracted = await extractWorkerFactsFromDocuments(openai, employeeId);
    if (Object.keys(extracted.details).length > 0) {
      const processed = processEmployeeAutofillRawDetails(extracted.details);
      const saved = await saveWorkerFacts(supabase, employeeId, processed, 'autofill');
      if (saved.error) {
        warning = saved.error;
      } else {
        loaded = await loadWorkerFacts(supabase, employeeId);
        snapshot = loaded.snapshot;
        workerFacts = snapshot?.values ?? saved.values ?? workerFacts;
      }
    } else if (extracted.error) {
      console.warn('Intake chatlike shared-fact extract:', extracted.error);
      warning = warning || extracted.error;
    }
  } catch (e) {
    console.warn('Intake chatlike shared-fact extract failed', e);
    warning =
      warning ||
      (e instanceof Error ? e.message : 'Werknemersgegevens uit documenten mislukt');
  }

  const imported = await importIntakeFromPdf({
    openai,
    supabase,
    employeeId,
    onPhase: (phase) => reportPdf(IMPORT_PHASE_STEP[phase]),
  });

  if (imported.error && !imported.sourceDocumentId) {
    if (isStagingEnv()) {
      try {
        const dossierSteps = [...INTAKE_AUTOFILL_STEPS_DOSSIER_ONLY];
        const reportDossier = createStepProgressReporter(dossierSteps, onProgress);
        reportDossier(0);
        // Reuse chatlike facts already saved above; step 0 is "feiten", step 1 generate.
        reportDossier(1);
        const dossier = await generateIntakeFromDossier({ openai, supabase, employeeId });
        if (!dossier.error) {
          const data = seedLockedThenFillGaps(
            normalizeIntakeControlledFields(ensureIntakeShape(dossier.data)),
            snapshot,
            workerFacts
          );
          data.meta.generation_notes = [
            'Intake gegenereerd vanuit dossierdocumenten (geen intakeformulier).',
            ...data.meta.generation_notes,
          ];
          return {
            data,
            sourceDocumentId: null,
            warning,
            gapFilled: false,
            generatedFromDossier: true,
            workerFacts,
            progressTotal: dossierSteps.length,
          };
        }
      } catch (e) {
        console.warn('Staging dossier-only intake generate failed', e);
      }
    }
    return {
      data: seedLockedThenFillGaps(ensureIntakeShape(imported.data), snapshot, workerFacts),
      sourceDocumentId: null,
      error: imported.error,
      warning,
      gapFilled: false,
      workerFacts,
      progressTotal: withPdfSteps.length,
    };
  }

  // Narratives from intake PDF; shared keys overlaid from WorkerFacts (chatlike).
  let data = seedLockedThenFillGaps(ensureIntakeShape(imported.data), snapshot, workerFacts);
  let gapFilled = false;
  warning = warning || imported.error || null;

  reportPdf(7);
  try {
    const dossier = await generateIntakeFromDossier({ openai, supabase, employeeId });
    if (!dossier.error) {
      data = seedLockedThenFillGaps(mergeIntakeFillBlanks(data, dossier.data), snapshot, workerFacts);
      gapFilled = true;
      data.meta.generation_notes = [
        ...data.meta.generation_notes,
        'Aangevuld vanuit dossierdocumenten (alleen lege velden).',
      ];
    } else if (dossier.data.meta.generation_notes.length > 0) {
      data = seedLockedThenFillGaps(mergeIntakeFillBlanks(data, dossier.data), snapshot, workerFacts);
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
      'Intake automatisch ingevuld (werknemersfeiten + intakeformulier + eventuele dossier-aanvulling).',
      ...data.meta.generation_notes,
    ];
  }

  return {
    data: normalizeIntakeControlledFields(ensureIntakeShape(data)),
    sourceDocumentId: imported.sourceDocumentId,
    warning,
    gapFilled,
    workerFacts,
    progressTotal: withPdfSteps.length,
  };
}
