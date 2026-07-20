import type { SupabaseClient } from '@supabase/supabase-js';
import { TP2026_BASIS_AUTOFILL_ENDPOINTS } from '@/lib/tp2026/basis-autofill-endpoints';
import {
  TP2026_GEgevens_EMPLOYEE_LABEL,
  TP2026_GEgevens_TP2_LABEL,
  TP2026_TP3_FIELD_ORDER,
  labelForTp3Field,
} from '@/lib/autofill-progress';
import {
  GEGEVENS_EMPLOYEE_KEYS,
  GEGEVENS_TP2_KEYS,
  applySuggestedReferentToTpData,
  getGegevensAutofillPlan,
  mergeGegevensAutofill,
  type SuggestedReferent,
} from '@/lib/tp2026/gegevens-autofill';
import { ensureTP2026Shape, mergeAutofillIntoTP2026 } from '@/lib/tp2026/mapping';
import { applyTrajectoryDateDerivations } from '@/lib/tp2026/trajectory-dates';
import { readAutofillResponse } from '@/lib/autofill-response';

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

async function runEmployeeAutofillStep(
  ctx: AutofillRunContext,
  currentData: Record<string, unknown>
): Promise<AutofillStepRunResult> {
  try {
    const res = await fetch(`/api/autofill-employee-info-working?employeeId=${ctx.employeeId}`, {
      signal: ctx.signal,
    });
    const parsed = await readAutofillResponse(res);
    if (!parsed.ok) {
      return {
        data: currentData,
        error: parsed.error,
      };
    }
    const json = parsed.json;

    const details = (json.details || json.data?.details) as Record<string, unknown> | undefined;
    const data = json.data || json;
    if (!details || Object.keys(details).length === 0) {
      return { data: currentData, error: 'Geen werknemersgegevens gevonden in documenten' };
    }

    let next = mergeGegevensAutofill(currentData, details, GEGEVENS_EMPLOYEE_KEYS, {
      overwrite: true,
    });
    const suggested = data.suggested_referent as SuggestedReferent | undefined;
    next = applySuggestedReferentToTpData(next, suggested);

    return {
      data: ensureTP2026Shape(next),
      employeePersist: {
        rawDetails: details,
        meta: {
          autofill_incomplete: data.autofill_incomplete,
          autofill_warnings: data.autofill_warnings,
        },
      },
    };
  } catch (e) {
    if (isAutofillAbortError(e) || ctx.signal?.aborted) throw e;
    return {
      data: currentData,
      error: e instanceof Error ? e.message : 'Werknemersprofiel autofill mislukt',
    };
  }
}

async function runTp2AutofillStep(
  ctx: AutofillRunContext,
  currentData: Record<string, unknown>
): Promise<AutofillStepRunResult> {
  try {
    const res = await fetch(`/api/autofill-tp-2?employeeId=${ctx.employeeId}`, {
      signal: ctx.signal,
    });
    const parsed = await readAutofillResponse(res);
    if (!parsed.ok) {
      return {
        data: currentData,
        error: parsed.error,
      };
    }
    const json = parsed.json;
    if (!json.success) {
      return {
        data: currentData,
        error: (typeof json.error === 'string' && json.error) || 'Gegevens traject autofill mislukt',
      };
    }
    const details = json.details as Record<string, unknown> | undefined;
    if (!details || Object.keys(details).length === 0) {
      return { data: currentData, error: 'Geen trajectgegevens gevonden in documenten' };
    }
    const next = mergeGegevensAutofill(currentData, details, GEGEVENS_TP2_KEYS, {
      overwrite: true,
    });
    return { data: ensureTP2026Shape(applyTrajectoryDateDerivations(next)) };
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
  json: { error?: string; details?: Record<string, unknown> },
  currentData: Record<string, unknown>
): AutofillStepRunResult {
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
    result.error = json.error;
  }
  return result;
}

export type RunAutofillStepsResult = {
  data: Record<string, unknown>;
  completed: number;
  failed: { id: string; label: string; error: string }[];
  cancelled: boolean;
  employeePersist?: EmployeeAutofillPersistPayload;
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
  };
}
