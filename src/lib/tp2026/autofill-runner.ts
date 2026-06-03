import type { SupabaseClient } from '@supabase/supabase-js';
import { TP2026_BASIS_AUTOFILL_ENDPOINTS } from '@/lib/tp2026/basis-autofill-endpoints';
import {
  TP2026_GEgevens_EMPLOYEE_LABEL,
  TP2026_GEgevens_TP2_LABEL,
  TP2026_TP3_FIELD_ORDER,
  labelForTp3Field,
} from '@/lib/autofill-progress';
import {
  EMPLOYEE_DETAILS_PERSIST_KEYS,
  applyEmployeeAutofillDetails,
} from '@/lib/employee/autofill-persist';
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

export type AutofillScope = 'all' | 'current_step';

export type AutofillRunContext = {
  employeeId: string;
  supabase: SupabaseClient;
};

export type AutofillRunStep = {
  id: string;
  label: string;
  run: (
    ctx: AutofillRunContext,
    currentData: Record<string, unknown>
  ) => Promise<{ data: Record<string, unknown>; error?: string }>;
};

export type AutofillProgressCallback = (progress: {
  currentIndex: number;
  total: number;
  currentLabel: string;
}) => void;

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
    run: (ctx, currentData) => runTp3FieldStep(ctx.employeeId, fieldKey, currentData),
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

async function runEmployeeAutofillStep(
  ctx: AutofillRunContext,
  currentData: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(`/api/autofill-employee-info-working?employeeId=${ctx.employeeId}`);
    const json = await res.json();
    if (!res.ok) {
      return {
        data: currentData,
        error: json.error || `HTTP ${res.status}`,
      };
    }

    const details = (json.details || json.data?.details) as Record<string, unknown> | undefined;
    const data = json.data || json;
    if (!details || Object.keys(details).length === 0) {
      return { data: currentData, error: 'Geen werknemersgegevens gevonden in documenten' };
    }

    let next = mergeGegevensAutofill(currentData, details, GEGEVENS_EMPLOYEE_KEYS);

    const existingDetails = Object.fromEntries(
      EMPLOYEE_DETAILS_PERSIST_KEYS.filter((key) => key !== 'autofilled_fields').map((key) => [
        key,
        currentData[key],
      ])
    );

    const persistResult = await applyEmployeeAutofillDetails(
      ctx.supabase,
      ctx.employeeId,
      existingDetails,
      details,
      {
        autofill_incomplete: data.autofill_incomplete,
        autofill_warnings: data.autofill_warnings,
      }
    );

    if (persistResult.error) {
      return { data: next, error: `Opslaan werknemersprofiel mislukt: ${persistResult.error}` };
    }

    next = mergeGegevensAutofill(next, persistResult.updatedDetails, GEGEVENS_EMPLOYEE_KEYS);

    const suggested = data.suggested_referent as SuggestedReferent | undefined;
    next = applySuggestedReferentToTpData(next, suggested);

    return { data: ensureTP2026Shape(next) };
  } catch (e) {
    return {
      data: currentData,
      error: e instanceof Error ? e.message : 'Werknemersprofiel autofill mislukt',
    };
  }
}

async function runTp2AutofillStep(
  ctx: AutofillRunContext,
  currentData: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(`/api/autofill-tp-2?employeeId=${ctx.employeeId}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        data: currentData,
        error: json.error || 'Gegevens traject autofill mislukt',
      };
    }
    if (!json.details || Object.keys(json.details).length === 0) {
      return { data: currentData, error: 'Geen trajectgegevens gevonden in documenten' };
    }
    const next = mergeGegevensAutofill(currentData, json.details, GEGEVENS_TP2_KEYS);
    return { data: ensureTP2026Shape(applyTrajectoryDateDerivations(next)) };
  } catch (e) {
    return {
      data: currentData,
      error: e instanceof Error ? e.message : 'Gegevens traject autofill mislukt',
    };
  }
}

async function runTp3FieldStep(
  employeeId: string,
  fieldKey: string,
  currentData: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; error?: string }> {
  const endpoint = TP2026_BASIS_AUTOFILL_ENDPOINTS[fieldKey];
  if (!endpoint) {
    return { data: currentData, error: `Geen autofill endpoint voor ${fieldKey}` };
  }

  try {
    const res = await fetch(`${endpoint}?employeeId=${employeeId}`);
    const json = await res.json();
    if (!res.ok) {
      return { data: currentData, error: json.error || `HTTP ${res.status}` };
    }

    let next: Record<string, unknown> = { ...currentData };
    if (json?.details && typeof json.details === 'object') {
      next = mergeAutofillIntoTP2026(next, json.details);
    }
    if (json?.data?.pow_meter) {
      next.pow_meter = json.data.pow_meter;
    }
    return { data: ensureTP2026Shape(next) };
  } catch (e) {
    return {
      data: currentData,
      error: e instanceof Error ? e.message : `Autofill mislukt voor ${fieldKey}`,
    };
  }
}

export type RunAutofillStepsResult = {
  data: Record<string, unknown>;
  completed: number;
  failed: { id: string; label: string; error: string }[];
  cancelled: boolean;
};

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
  const total = steps.length;

  for (let i = 0; i < steps.length; i++) {
    if (options.shouldCancel?.()) {
      return {
        data: ensureTP2026Shape(applyTrajectoryDateDerivations(data)),
        completed,
        failed,
        cancelled: true,
      };
    }

    const step = steps[i];
    options.onProgress({
      currentIndex: i + 1,
      total,
      currentLabel: step.label,
    });

    const result = await step.run(ctx, data);
    data = result.data;
    if (result.error) {
      failed.push({ id: step.id, label: step.label, error: result.error });
    } else {
      completed += 1;
    }
  }

  return {
    data: ensureTP2026Shape(applyTrajectoryDateDerivations(data)),
    completed,
    failed,
    cancelled: false,
  };
}
