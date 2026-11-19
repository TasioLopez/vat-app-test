import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isStagingEnv } from '@/lib/auth/staging-only';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { isGespreksverslagDocType } from '@/lib/documents/employee-doc-types';
import { loadWorkerFacts, type WorkerFactsSnapshot } from '@/lib/employee/save-worker-facts';
import { importIntakeFromPdf } from '@/lib/intake/import-from-pdf';
import { generateIntakeFromDossier } from '@/lib/intake/generate-from-dossier';
import { applyGespreksverslagFactHints } from '@/lib/intake/gespreksverslag-fact-hints';
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

async function loadGespreksverslagText(
  supabase: SupabaseClient,
  employeeId: string
): Promise<string | null> {
  const { data: docs } = await supabase
    .from('documents')
    .select('type, url, name, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });
  const hit = (docs || []).find((d) => isGespreksverslagDocType(d.type) && d.url);
  if (!hit?.url) return null;
  const path = extractStoragePath(hit.url);
  if (!path) return null;
  const { data: file } = await supabase.storage.from('documents').download(path);
  if (!file) return null;
  const text = Buffer.from(await file.arrayBuffer()).toString('utf8').trim();
  return text || null;
}

/**
 * Intake-first autofill: extract from intake PDF, gap-fill from dossier, then apply
 * validated WorkerFacts locks. Unvalidated worker noise must not overwrite extraction.
 */
export async function autofillIntakeFromDocuments(params: {
  openai: OpenAI;
  supabase: SupabaseClient;
  employeeId: string;
}): Promise<AutofillIntakeResult> {
  const { openai, supabase, employeeId } = params;

  const loaded = await loadWorkerFacts(supabase, employeeId);
  const snapshot = loaded.snapshot;
  const workerFacts = snapshot?.values ?? {};

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
          let data = seedLockedThenFillGaps(
            normalizeIntakeControlledFields(ensureIntakeShape(dossier.data)),
            snapshot,
            workerFacts
          );
          try {
            const prose = await loadGespreksverslagText(supabase, employeeId);
            if (prose) data = applyGespreksverslagFactHints(data, prose);
          } catch (e) {
            console.warn('Gespreksverslag fact hints failed', e);
          }
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
      data: seedLockedThenFillGaps(ensureIntakeShape(imported.data), snapshot, workerFacts),
      sourceDocumentId: null,
      error: imported.error,
      gapFilled: false,
      workerFacts,
    };
  }

  // Document extraction first; locked worker facts win; unvalidated facts only fill blanks.
  let data = seedLockedThenFillGaps(ensureIntakeShape(imported.data), snapshot, workerFacts);
  let gapFilled = false;
  let warning: string | null = imported.error || null;

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

  // Deterministic prose hints (hours / Dutch) when intake checkboxes were blank.
  try {
    const prose = await loadGespreksverslagText(supabase, employeeId);
    if (prose) {
      const beforeHours = data.s2.contract_hours;
      const beforeDutch = data.s17.dutch_speaking;
      data = applyGespreksverslagFactHints(data, prose);
      if (data.s2.contract_hours !== beforeHours || data.s17.dutch_speaking !== beforeDutch) {
        data.meta.generation_notes = [
          ...data.meta.generation_notes,
          'Aangevuld vanuit gespreksverslag (uren/taal, alleen lege velden).',
        ];
        gapFilled = true;
      }
    }
  } catch (e) {
    console.warn('Gespreksverslag fact hints failed', e);
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
