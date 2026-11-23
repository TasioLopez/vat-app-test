import type { SupabaseClient } from '@supabase/supabase-js';
import { TP2026_BASIS_AUTOFILL_ENDPOINTS } from '@/lib/tp2026/basis-autofill-endpoints';
import {
  TP2026_GEgevens_EMPLOYEE_LABEL,
  TP2026_GEgevens_TP2_LABEL,
  TP2026_TP3_FIELD_ORDER,
  labelForTp3Field,
} from '@/lib/autofill-progress';
import {
  applySuggestedReferentToTpData,
  getGegevensAutofillPlan,
  type SuggestedReferent,
} from '@/lib/tp2026/gegevens-autofill';
import { ensureTP2026Shape, mergeAutofillIntoTP2026 } from '@/lib/tp2026/mapping';
import { applyTrajectoryDateDerivations } from '@/lib/tp2026/trajectory-dates';
import { consumeAutofillProgressStream } from '@/lib/autofill-progress-stream';
import { getAutofillDetailsPayload, readAutofillResponse } from '@/lib/autofill-response';
import {
  applyExWerknemerBijlage1Rule,
  materializeSpoor2ForExWerknemer,
} from '@/lib/tp/tp_activities';
import type { TP2026Bijlage1Phase } from '@/lib/tp2026/schema';
import {
  getValidatedIntakeForEmployee,
  gegevensFromWorkerFacts,
  workerFactsHaveSharedGegevens,
} from '@/lib/intake/tp-hydrate';
import {
  applyWorkerFacts,
  loadWorkerFacts,
  planWorkerFactWrites,
  type SkippedValidatedField,
} from '@/lib/employee/save-worker-facts';

export type AutofillScope = 'all' | 'current_step';

export type AutofillRunContext = {
  employeeId: string;
  supabase: SupabaseClient;
  signal?: AbortSignal;
};

export type EmployeeAutofillPersistPayload = {
  rawDetails: Record<string, unknown>;
  meta?: {
    autofill_incomplete?: boolean;
    autofill_warnings?: { message?: string }[];
  };
};

export type AutofillStepRunResult = {
  data: Record<string, unknown>;
  error?: string;
  employeePersist?: EmployeeAutofillPersistPayload;
  factProposal?: Record<string, unknown>;
  skippedValidated?: SkippedValidatedField[];
};

export type AutofillRunStep = {
  id: string;
  label: string;
  run: (ctx: AutofillRunContext, currentData: Record<string, unknown>) => Promise<AutofillStepRunResult>;
};

export type AutofillProgressCallback = (progress: {
  currentIndex: number;
  total: number;
  currentLabel: string;
}) => void;

export function isAutofillAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  if (e instanceof Error && e.name === 'AbortError') return true;
  return false;
}

function isCancelled(ctx: AutofillRunContext, shouldCancel?: () => boolean): boolean {
  return Boolean(shouldCancel?.() || ctx.signal?.aborted);
}

export function canAutofillCurrentStep(currentStep: number): boolean {
  return currentStep === 2 || currentStep === 3;
}

function buildGegevensSteps(tpData: Record<string, unknown>): AutofillRunStep[] {
  const plan = getGegevensAutofillPlan(tpData);
  const steps: AutofillRunStep[] = [];

  if (plan.runEmployee) {
    steps.push({
      id: 'employee',
      label: TP2026_GEgevens_EMPLOYEE_LABEL,
      run: runEmployeeAutofillStep,
    });
  }
  if (plan.runTp2) {
    steps.push({
      id: 'tp2',
      label: TP2026_GEgevens_TP2_LABEL,
      run: runTp2AutofillStep,
    });
  }

  return steps;
}

function buildTp3Steps(): AutofillRunStep[] {
  return TP2026_TP3_FIELD_ORDER.map((fieldKey) => ({
    id: fieldKey,
    label: labelForTp3Field(fieldKey),
    run: (ctx, currentData) => runTp3FieldStep(ctx, fieldKey, currentData),
  }));
}

export function buildAutofillSteps(
  scope: AutofillScope,
  currentStep: number,
  tpData: Record<string, unknown>
): AutofillRunStep[] {
  if (scope === 'current_step') {
    if (currentStep === 2) return buildGegevensSteps(tpData);
    if (currentStep === 3) return buildTp3Steps();
    return [];
  }
  return [...buildGegevensSteps(tpData), ...buildTp3Steps()];
}

export function buildSingleTp3AutofillStep(fieldKey: string): AutofillRunStep | null {
  if (!(TP2026_TP3_FIELD_ORDER as readonly string[]).includes(fieldKey)) return null;
  return {
    id: fieldKey,
    label: labelForTp3Field(fieldKey),
    run: (ctx, currentData) => runTp3FieldStep(ctx, fieldKey, currentData),
  };
}

async function previewFactProposal(
  ctx: AutofillRunContext,
  currentData: Record<string, unknown>,
  proposal: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; skippedValidated: SkippedValidatedField[]; error?: string }> {
  const loaded = await loadWorkerFacts(ctx.supabase, ctx.employeeId);
  if (!loaded.snapshot) {
    return {
      data: currentData,
      skippedValidated: [],
      error: loaded.error || 'Werknemersgegevens laden mislukt',
    };
  }
  const planned = planWorkerFactWrites(loaded.snapshot, proposal, 'autofill');
  return {
    data: applyWorkerFacts(currentData, planned.values),
    skippedValidated: planned.skippedValidated,
  };
}

async function runEmployeeAutofillStep(
  ctx: AutofillRunContext,
  currentData: Record<string, unknown>
): Promise<AutofillStepRunResult> {
  try {
    // Shared profile keys always come from WorkerFacts — never blanked intake JSON.
    const fromWorker = await gegevensFromWorkerFacts(ctx.supabase, ctx.employeeId);
    if (fromWorker.error) return { data: currentData, error: fromWorker.error };

    if (workerFactsHaveSharedGegevens(fromWorker.details)) {
      const details = fromWorker.details;
      const preview = await previewFactProposal(ctx, currentData, details);
      if (preview.error) return { data: currentData, error: preview.error };
      const validated = await getValidatedIntakeForEmployee(ctx.supabase, ctx.employeeId);
      let next = preview.data;
      if (validated) {
        const ref = validated.data.s4;
        const nameParts = (ref.referent_name || '').trim().split(/\s+/).filter(Boolean);
        next = applySuggestedReferentToTpData(next, {
          first_name: nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0],
          last_name: nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined,
          referent_function: ref.referent_function || undefined,
          phone: ref.referent_phone || undefined,
          email: ref.referent_email || undefined,
        } as SuggestedReferent);
      }
      return {
        data: ensureTP2026Shape(next),
        employeePersist: { rawDetails: details },
        factProposal: details,
        skippedValidated: preview.skippedValidated,
      };
    }

    const res = await fetch(`/api/autofill-employee-info-chatlike?employeeId=${ctx.employeeId}`, {
      signal: ctx.signal,
    });
    let json: Record<string, unknown>;
    try {
      json = await consumeAutofillProgressStream(res);
    } catch (e) {
      if (isAutofillAbortError(e) || ctx.signal?.aborted) throw e;
      return {
        data: currentData,
        error: e instanceof Error ? e.message : 'Werknemersprofiel autofill mislukt',
      };
    }
    if (json.success === false) {
      return {
        data: currentData,
        error:
          (typeof json.error === 'string' && json.error) ||
          (typeof json.message === 'string' && json.message) ||
          'Werknemersprofiel autofill mislukt',
      };
    }
    const { details, data } = getAutofillDetailsPayload(json);
    if (!details || Object.keys(details).length === 0) {
      return { data: currentData, error: 'Geen werknemersgegevens gevonden in documenten' };
    }

    const preview = await previewFactProposal(ctx, currentData, details);
    if (preview.error) return { data: currentData, error: preview.error };
    const suggested = data.suggested_referent as SuggestedReferent | undefined;
    const next = applySuggestedReferentToTpData(preview.data, suggested);

    return {
      data: ensureTP2026Shape(next),
      employeePersist: {
        rawDetails: details,
        meta: {
          autofill_incomplete: data.autofill_incomplete as boolean | undefined,
          autofill_warnings: data.autofill_warnings as { message?: string }[] | undefined,
        },
      },
      factProposal: details,
      skippedValidated: preview.skippedValidated,
    };
  } catch (e) {
    if (isAutofillAbortError(e) || ctx.signal?.aborted) throw e;
    return {
      data: currentData,
      error: e instanceof Error ? e.message : 'Werknemersprofiel autofill mislukt',
    };
  }
}

/** When WorkerFacts exist but bedrijfsarts/AD meta are still blank, TP2 must still run. */
export function tp2MetaGapsNeedExtraction(data: Record<string, unknown>): boolean {
  const org = String(data.occupational_doctor_org ?? '').trim();
  if (!org) return true;
  if (data.ad_report_concept === true) return false;
  if (data.has_ad_report !== true && data.has_ad_report !== false) return true;
  return false;
}

function finalizeTp2Data(next: Record<string, unknown>): Record<string, unknown> {
  let data = next;
  if (data.is_ex_werknemer === true) {
    const spoor2 = materializeSpoor2ForExWerknemer(data.tp3_activities, true);
    if (spoor2) data = { ...data, tp3_activities: spoor2 };
  }
  const shaped = ensureTP2026Shape(applyTrajectoryDateDerivations(data));
  if (shaped.is_ex_werknemer === true && Array.isArray(shaped.bijlage1_phases)) {
    shaped.bijlage1_phases = applyExWerknemerBijlage1Rule(
      shaped.bijlage1_phases as TP2026Bijlage1Phase[],
      true
    );
  }
  return shaped;
}

async function fetchTp2Details(
  ctx: AutofillRunContext
): Promise<{ details: Record<string, unknown> | null; error?: string }> {
  const res = await fetch(`/api/autofill-tp-2?employeeId=${ctx.employeeId}`, {
    signal: ctx.signal,
  });
  const parsed = await readAutofillResponse(res);
  if (!parsed.ok) return { details: null, error: parsed.error };
  const json = parsed.json;
  if (!json.success) {
    return {
      details: null,
      error: (typeof json.error === 'string' && json.error) || 'Gegevens traject autofill mislukt',
    };
  }
  const { details } = getAutofillDetailsPayload(json);
  if (!details || Object.keys(details).length === 0) {
    return { details: null, error: 'Geen trajectgegevens gevonden in documenten' };
  }
  return { details };
}

async function runTp2AutofillStep(
  ctx: AutofillRunContext,
  currentData: Record<string, unknown>
): Promise<AutofillStepRunResult> {
  try {
    // TP stap-2 shared keys hydrate from WorkerFacts first (intake JSON blanks them).
    const fromWorker = await gegevensFromWorkerFacts(ctx.supabase, ctx.employeeId);
    if (fromWorker.error) return { data: currentData, error: fromWorker.error };

    if (workerFactsHaveSharedGegevens(fromWorker.details)) {
      const details = fromWorker.details;
      const preview = await previewFactProposal(ctx, currentData, details);
      if (preview.error) return { data: currentData, error: preview.error };
      let next = preview.data;

      // Still extract bedrijfsarts / AD from documents when meta gaps remain.
      if (tp2MetaGapsNeedExtraction(next)) {
        const tp2 = await fetchTp2Details(ctx);
        if (tp2.details) {
          const gapPreview = await previewFactProposal(ctx, next, tp2.details);
          if (!gapPreview.error) {
            next = gapPreview.data;
            return {
              data: finalizeTp2Data(next),
              factProposal: { ...details, ...tp2.details },
              skippedValidated: [
                ...(preview.skippedValidated ?? []),
                ...(gapPreview.skippedValidated ?? []),
              ],
            };
          }
        }
        // Soft: keep WorkerFacts result if TP2 fails; do not fail the whole stap-2.
      }

      return {
        data: finalizeTp2Data(next),
        factProposal: details,
        skippedValidated: preview.skippedValidated,
      };
    }

    const tp2 = await fetchTp2Details(ctx);
    if (tp2.error || !tp2.details) {
      return { data: currentData, error: tp2.error || 'Geen trajectgegevens gevonden in documenten' };
    }
    const preview = await previewFactProposal(ctx, currentData, tp2.details);
    if (preview.error) return { data: currentData, error: preview.error };
    return {
      data: finalizeTp2Data(preview.data),
      factProposal: tp2.details,
      skippedValidated: preview.skippedValidated,
    };
  } catch (e) {
    if (isAutofillAbortError(e) || ctx.signal?.aborted) throw e;
    return {
      data: currentData,
      error: e instanceof Error ? e.message : 'Gegevens traject autofill mislukt',
    };
  }
}

async function runTp3FieldStep(
  ctx: AutofillRunContext,
  fieldKey: string,
  currentData: Record<string, unknown>
): Promise<AutofillStepRunResult> {
  const endpoint = TP2026_BASIS_AUTOFILL_ENDPOINTS[fieldKey];
  if (!endpoint) {
    return { data: currentData, error: `Geen autofill endpoint voor ${fieldKey}` };
  }

  try {
    const res = await fetch(`${endpoint}?employeeId=${ctx.employeeId}`, {
      signal: ctx.signal,
    });
    const json = await res.json();
    if (!res.ok) {
      return { data: currentData, error: json.error || `HTTP ${res.status}` };
    }

    return resolveTp3AutofillJson(json, currentData);
  } catch (e) {
    if (isAutofillAbortError(e) || ctx.signal?.aborted) throw e;
    return {
      data: currentData,
      error: e instanceof Error ? e.message : `Autofill mislukt voor ${fieldKey}`,
    };
  }
}

function hasMeaningfulAutofillDetails(details: Record<string, unknown>): boolean {
  return Object.values(details).some(
    (value) => typeof value === 'string' && value.trim().length > 0
  );
}

/** Maps a TP3 autofill API JSON body to a step result (handles HTTP 200 + error responses). */
export function resolveTp3AutofillJson(
  json: {
    error?: string;
    details?: Record<string, unknown>;
    requires_clarification?: boolean;
    clarification_question?: string;
    warnings?: string[];
  },
  currentData: Record<string, unknown>
): AutofillStepRunResult {
  const clarification =
    typeof json.clarification_question === 'string'
      ? json.clarification_question.trim()
      : '';

  // Zoekprofiel V3: clarification persists draft for interactive editor (soft — not Autofill mislukt)
  if (json.requires_clarification || clarification) {
    const details =
      json?.details && typeof json.details === 'object'
        ? (json.details as Record<string, unknown>)
        : {};
    const draftRaw =
      details.zoekprofiel_clarification_draft ??
      (json as { draft?: unknown }).draft;
    let next: Record<string, unknown> = { ...currentData };
    if (draftRaw) {
      next = { ...next, zoekprofiel_clarification_draft: draftRaw };
    }
    return {
      data: ensureTP2026Shape(next),
      // Soft outcome: draft is available in ZoekprofielEditor; do not fail the autofill run
    };
  }

  const details =
    json?.details && typeof json.details === 'object' ? json.details : undefined;
  const hasDetails = details ? hasMeaningfulAutofillDetails(details) : false;

  if (json.error && !hasDetails) {
    return { data: currentData, error: json.error };
  }

  let next: Record<string, unknown> = { ...currentData };
  if (details) {
    next = mergeAutofillIntoTP2026(next, details);
  }

  const result: AutofillStepRunResult = { data: ensureTP2026Shape(next) };
  if (json.error) {
    // Hard/partial API errors may still carry details; keep them as step errors.
    result.error = json.error;
  }
  // Soft `warnings` (e.g. AD-only zoekprofiel) must not mark a successful step as failed.
  return result;
}

export type RunAutofillStepsResult = {
  data: Record<string, unknown>;
  completed: number;
  failed: { id: string; label: string; error: string }[];
  cancelled: boolean;
  employeePersist?: EmployeeAutofillPersistPayload;
  factProposal?: Record<string, unknown>;
  skippedValidated?: SkippedValidatedField[];
};

function cancelledResult(initialData: Record<string, unknown>): RunAutofillStepsResult {
  return {
    data: initialData,
    completed: 0,
    failed: [],
    cancelled: true,
    employeePersist: undefined,
  };
}

export async function runAutofillSteps(
  steps: AutofillRunStep[],
  ctx: AutofillRunContext,
  initialData: Record<string, unknown>,
  options: {
    onProgress: AutofillProgressCallback;
    shouldCancel?: () => boolean;
  }
): Promise<RunAutofillStepsResult> {
  let data = { ...initialData };
  const failed: { id: string; label: string; error: string }[] = [];
  let completed = 0;
  let employeePersist: EmployeeAutofillPersistPayload | undefined;
  let factProposal: Record<string, unknown> = {};
  const skippedValidated: SkippedValidatedField[] = [];
  const total = steps.length;

  for (let i = 0; i < steps.length; i++) {
    if (isCancelled(ctx, options.shouldCancel)) {
      return cancelledResult(initialData);
    }

    const step = steps[i];
    options.onProgress({
      currentIndex: i + 1,
      total,
      currentLabel: step.label,
    });

    try {
      const result = await step.run(ctx, data);

      if (isCancelled(ctx, options.shouldCancel)) {
        return cancelledResult(initialData);
      }

      data = result.data;
      if (result.employeePersist) {
        employeePersist = result.employeePersist;
      }
      if (result.factProposal) {
        factProposal = { ...factProposal, ...result.factProposal };
      }
      if (result.skippedValidated?.length) {
        skippedValidated.push(...result.skippedValidated);
      }
      if (result.error) {
        failed.push({ id: step.id, label: step.label, error: result.error });
      } else {
        completed += 1;
      }
    } catch (e) {
      if (isAutofillAbortError(e) || isCancelled(ctx, options.shouldCancel)) {
        return cancelledResult(initialData);
      }
      throw e;
    }
  }

  return {
    data: ensureTP2026Shape(applyTrajectoryDateDerivations(data)),
    completed,
    failed,
    cancelled: false,
    employeePersist,
    factProposal: Object.keys(factProposal).length > 0 ? factProposal : undefined,
    skippedValidated,
  };
}
