import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeEmployeeFieldHash,
  getEmployeeFieldDisplayStatus,
  normalizeEmployeeFieldContentHash,
  normalizeEmployeeFieldReviewStatus,
  type EmployeeDetailFieldKey,
  type EmployeeFieldReviewStatus,
} from '@/lib/employee/field-review';
import { isBasisSectionEmpty, withBasisSectionReview } from '@/lib/tp2026/basis-section-review';
import type { BasisEditorSectionId } from '@/lib/tp2026/basis-editor-sections';
import {
  GEGEVENS_EMPLOYEE_KEYS,
  GEGEVENS_TP2_KEYS,
  isEmptyGegevensField,
} from '@/lib/tp2026/gegevens-autofill';

/** Name and email live on `employees`. Email review state is stored on `employee_details`. */
const EMPLOYEE_ROW_KEYS = ['first_name', 'last_name', 'email'] as const;

/** Case facts on `tp_meta`, excluding `is_ex_werknemer` (reviewed with the profile). */
export const WORKER_CASE_KEYS = GEGEVENS_TP2_KEYS.filter((key) => key !== 'is_ex_werknemer');

/** Keys copied onto a draft for display and removed again before `data_json` is stored. */
export const WORKER_FACT_KEYS = [
  ...EMPLOYEE_ROW_KEYS,
  ...GEGEVENS_EMPLOYEE_KEYS.filter((key) => key !== 'email'),
  ...WORKER_CASE_KEYS,
] as const;

export type WorkerFactKey = (typeof WORKER_FACT_KEYS)[number];

const WORKER_FACT_KEY_SET = new Set<string>(WORKER_FACT_KEYS);

const PROFILE_REVIEW_KEYS = new Set<string>([
  ...EMPLOYEE_ROW_KEYS,
  ...GEGEVENS_EMPLOYEE_KEYS.filter((key) => key !== 'email'),
]);

const DEPENDENT_BASIS_SECTIONS = [
  'inleiding',
  'persoonlijk_profiel',
  'praktische_belemmeringen',
  'zoekprofiel',
] as const satisfies readonly BasisEditorSectionId[];

export const WORKER_FACTS_HASH_FIELD = 'worker_facts_hash';

export type SaveWorkerFactsMode = 'human' | 'autofill' | 'confirm';

export type SkippedValidatedField = {
  key: string;
  current: unknown;
  proposed: unknown;
};

export type WorkerFactsSnapshot = {
  values: Record<string, unknown>;
  profileReview: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>>;
  profileHash: Partial<Record<EmployeeDetailFieldKey, string>>;
  caseReview: Partial<Record<string, EmployeeFieldReviewStatus>>;
  caseHash: Partial<Record<string, string>>;
};

export type PlanWorkerFactWritesOptions = {
  confirmKeys?: readonly string[];
  /** Employee-page form already decided review maps. Use them instead of auto-downgrading. */
  preserveProfileReview?: { status: unknown; hash: unknown };
};

export type PlannedWorkerFactWrites = {
  written: string[];
  skippedValidated: SkippedValidatedField[];
  values: Record<string, unknown>;
  profileReview: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>>;
  profileHash: Partial<Record<EmployeeDetailFieldKey, string>>;
  caseReview: Partial<Record<string, EmployeeFieldReviewStatus>>;
  caseHash: Partial<Record<string, string>>;
};

function isProfileKey(key: string): boolean {
  return PROFILE_REVIEW_KEYS.has(key);
}

function normalizeCaseValue(key: string, value: unknown): unknown {
  if (key === 'has_ad_report' || key === 'ad_report_concept') {
    if (value === null || value === undefined) return null;
    return Boolean(value);
  }
  if (key === 'tp_lead_time') {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(n) ? n : null;
  }
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return value;
}

function factHash(key: string, value: unknown): string {
  if (isProfileKey(key)) {
    return computeEmployeeFieldHash(key as EmployeeDetailFieldKey, {
      [key]: value,
    } as Partial<Record<EmployeeDetailFieldKey, unknown>>);
  }
  return JSON.stringify(normalizeCaseValue(key, value));
}

function factsEqual(key: string, left: unknown, right: unknown): boolean {
  return factHash(key, left) === factHash(key, right);
}

function isValidated(snapshot: WorkerFactsSnapshot, key: string): boolean {
  if (isProfileKey(key)) {
    return (
      getEmployeeFieldDisplayStatus(
        key as EmployeeDetailFieldKey,
        snapshot.values as Partial<Record<EmployeeDetailFieldKey, unknown>>,
        snapshot.profileReview,
        snapshot.profileHash
      ) === 'validated'
    );
  }
  const status = snapshot.caseReview[key];
  if (status !== 'validated') return false;
  const currentHash = factHash(key, snapshot.values[key]);
  return snapshot.caseHash[key] === currentHash;
}

function markReview(
  snapshot: WorkerFactsSnapshot,
  key: string,
  cleared: boolean
): void {
  if (isProfileKey(key)) {
    const field = key as EmployeeDetailFieldKey;
    if (cleared) {
      delete snapshot.profileReview[field];
      delete snapshot.profileHash[field];
      return;
    }
    snapshot.profileReview[field] = 'review';
    delete snapshot.profileHash[field];
    return;
  }
  if (cleared) {
    delete snapshot.caseReview[key];
    delete snapshot.caseHash[key];
    return;
  }
  snapshot.caseReview[key] = 'review';
  delete snapshot.caseHash[key];
}

/**
 * Decide which shared facts to write.
 * `human` writes changed keys, including a clear. A boolean `false` does not replace `null`
 * (an untouched checkbox). `autofill` skips empty incoming values and validated fields.
 * `confirm` writes the accepted keys even when they were validated.
 */
export function planWorkerFactWrites(
  current: WorkerFactsSnapshot,
  incoming: Record<string, unknown>,
  mode: SaveWorkerFactsMode,
  options?: PlanWorkerFactWritesOptions
): PlannedWorkerFactWrites {
  const values = { ...current.values };
  const profileReview = { ...current.profileReview };
  const profileHash = { ...current.profileHash };
  const caseReview = { ...current.caseReview };
  const caseHash = { ...current.caseHash };
  const working: WorkerFactsSnapshot = {
    values,
    profileReview,
    profileHash,
    caseReview,
    caseHash,
  };
  const written: string[] = [];
  const skippedValidated: SkippedValidatedField[] = [];
  const confirmSet = new Set(options?.confirmKeys ?? []);

  for (const key of WORKER_FACT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(incoming, key)) continue;
    if (mode === 'confirm' && !confirmSet.has(key)) continue;
    const proposed = incoming[key];
    const existing = values[key];
    if (factsEqual(key, existing, proposed)) continue;

    if (mode === 'autofill' || mode === 'confirm') {
      if (isEmptyGegevensField(key, proposed)) continue;
    } else if (
      typeof proposed === 'boolean' &&
      proposed === false &&
      (existing === null || existing === undefined)
    ) {
      continue;
    }

    if (mode === 'autofill' && isValidated(working, key)) {
      skippedValidated.push({ key, current: existing ?? null, proposed });
      continue;
    }

    values[key] = isProfileKey(key)
      ? JSON.parse(factHash(key, proposed))
      : normalizeCaseValue(key, proposed);
    written.push(key);
    if (mode !== 'human' || !options?.preserveProfileReview) {
      markReview(working, key, isEmptyGegevensField(key, values[key]));
    }
  }

  if (options?.preserveProfileReview) {
    working.profileReview = normalizeEmployeeFieldReviewStatus(options.preserveProfileReview.status);
    working.profileHash = normalizeEmployeeFieldContentHash(options.preserveProfileReview.hash);
  }

  return {
    written,
    skippedValidated,
    values,
    profileReview: working.profileReview,
    profileHash: working.profileHash,
    caseReview: working.caseReview,
    caseHash: working.caseHash,
  };
}

export function workerFactsFromRows(
  employee: Record<string, unknown> | null | undefined,
  details: Record<string, unknown> | null | undefined,
  meta: Record<string, unknown> | null | undefined
): WorkerFactsSnapshot {
  const values: Record<string, unknown> = {};
  if (employee) {
    for (const key of EMPLOYEE_ROW_KEYS) {
      if (employee[key] !== undefined) values[key] = employee[key];
    }
  }
  if (details) {
    for (const key of WORKER_FACT_KEYS) {
      if (!isProfileKey(key) || key === 'email' || key === 'first_name' || key === 'last_name') continue;
      if (Object.prototype.hasOwnProperty.call(details, key)) values[key] = details[key];
    }
  }
  if (meta) {
    for (const key of WORKER_CASE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(meta, key)) values[key] = meta[key];
    }
  }
  if (details && typeof details.is_ex_werknemer === 'boolean') {
    values.is_ex_werknemer = details.is_ex_werknemer;
  } else if (meta && typeof meta.is_ex_werknemer === 'boolean') {
    values.is_ex_werknemer = meta.is_ex_werknemer;
  }

  return {
    values,
    profileReview: normalizeEmployeeFieldReviewStatus(details?.field_review_status),
    profileHash: normalizeEmployeeFieldContentHash(details?.field_content_hash),
    caseReview: normalizeCaseReview(meta?.field_review_status),
    caseHash: normalizeCaseHash(meta?.field_content_hash),
  };
}

function normalizeCaseReview(raw: unknown): Partial<Record<string, EmployeeFieldReviewStatus>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<string, EmployeeFieldReviewStatus>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!WORKER_CASE_KEYS.includes(key as (typeof WORKER_CASE_KEYS)[number])) continue;
    if (value === 'review' || value === 'validated') out[key] = value;
  }
  return out;
}

function normalizeCaseHash(raw: unknown): Partial<Record<string, string>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<string, string>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!WORKER_CASE_KEYS.includes(key as (typeof WORKER_CASE_KEYS)[number])) continue;
    if (typeof value === 'string' && value.trim()) out[key] = value;
  }
  return out;
}

export function applyWorkerFacts(
  data: Record<string, unknown>,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...data };
  for (const key of WORKER_FACT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(facts, key)) next[key] = facts[key];
  }
  return next;
}

export function stripWorkerFacts(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  for (const key of WORKER_FACT_KEYS) delete next[key];
  return next;
}

export function computeWorkerFactsHash(facts: Record<string, unknown>): string {
  const normalized: Record<string, unknown> = {};
  for (const key of WORKER_FACT_KEYS) normalized[key] = JSON.parse(factHash(key, facts[key]));
  return JSON.stringify(normalized);
}

/** Overlay the worker record and, when it changed since this draft was saved, mark basis text for review. */
export function applyWorkerFactsToDocument(
  data: Record<string, unknown>,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const nextHash = computeWorkerFactsHash(facts);
  const previous = typeof data[WORKER_FACTS_HASH_FIELD] === 'string' ? data[WORKER_FACTS_HASH_FIELD] : '';
  let next = applyWorkerFacts(data, facts);
  if (previous && previous !== nextHash) {
    for (const id of DEPENDENT_BASIS_SECTIONS) {
      if (!isBasisSectionEmpty(id, next)) {
        next = withBasisSectionReview(next, id, 'review');
      }
    }
  }
  next[WORKER_FACTS_HASH_FIELD] = nextHash;
  return next;
}

export async function loadWorkerFacts(
  supabase: SupabaseClient,
  employeeId: string
): Promise<{ snapshot?: WorkerFactsSnapshot; error?: string }> {
  const [employeeRes, detailsRes, metaRes] = await Promise.all([
    supabase.from('employees').select('first_name,last_name,email').eq('id', employeeId).maybeSingle(),
    supabase.from('employee_details').select('*').eq('employee_id', employeeId).maybeSingle(),
    supabase.from('tp_meta').select('*').eq('employee_id', employeeId).maybeSingle(),
  ]);
  const error = employeeRes.error || detailsRes.error || metaRes.error;
  if (error) return { error: error.message };
  return {
    snapshot: workerFactsFromRows(
      (employeeRes.data || null) as Record<string, unknown> | null,
      (detailsRes.data || null) as Record<string, unknown> | null,
      (metaRes.data || null) as Record<string, unknown> | null
    ),
  };
}

function reviewMapsEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function saveWorkerFacts(
  supabase: SupabaseClient,
  employeeId: string,
  incoming: Record<string, unknown>,
  mode: SaveWorkerFactsMode,
  options?: PlanWorkerFactWritesOptions
): Promise<PlannedWorkerFactWrites & { error?: string }> {
  const loaded = await loadWorkerFacts(supabase, employeeId);
  if (!loaded.snapshot) {
    return {
      written: [],
      skippedValidated: [],
      values: {},
      profileReview: {},
      profileHash: {},
      caseReview: {},
      caseHash: {},
      error: loaded.error || 'Werknemersgegevens laden mislukt',
    };
  }
  const planned = planWorkerFactWrites(loaded.snapshot, incoming, mode, options);

  const detailKeys = WORKER_FACT_KEYS.filter(
    (key) => isProfileKey(key) && key !== 'email' && key !== 'first_name' && key !== 'last_name'
  );
  const detailPatch: Record<string, unknown> = {};
  for (const key of detailKeys) {
    if (planned.written.includes(key)) detailPatch[key] = planned.values[key];
  }
  const profileReviewChanged = !reviewMapsEqual(
    planned.profileReview as Record<string, unknown>,
    loaded.snapshot.profileReview as Record<string, unknown>
  );
  const profileHashChanged = !reviewMapsEqual(
    planned.profileHash as Record<string, unknown>,
    loaded.snapshot.profileHash as Record<string, unknown>
  );
  if (profileReviewChanged) detailPatch.field_review_status = planned.profileReview;
  if (profileHashChanged) detailPatch.field_content_hash = planned.profileHash;
  if (Object.keys(detailPatch).length > 0) {
    const { error } = await supabase.from('employee_details').upsert(
      [{ employee_id: employeeId, ...detailPatch }],
      { onConflict: 'employee_id' }
    );
    if (error) return { ...planned, error: error.message };
  }

  const employeePatch: Record<string, unknown> = {};
  for (const key of EMPLOYEE_ROW_KEYS) {
    if (planned.written.includes(key)) employeePatch[key] = planned.values[key];
  }
  if (Object.keys(employeePatch).length > 0) {
    const { error } = await supabase.from('employees').update(employeePatch).eq('id', employeeId);
    if (error) return { ...planned, error: error.message };
  }

  const metaPatch: Record<string, unknown> = {};
  for (const key of WORKER_CASE_KEYS) {
    if (planned.written.includes(key)) metaPatch[key] = planned.values[key];
  }
  if (planned.written.includes('is_ex_werknemer')) {
    metaPatch.is_ex_werknemer = planned.values.is_ex_werknemer;
  }
  const caseReviewChanged = !reviewMapsEqual(
    planned.caseReview,
    loaded.snapshot.caseReview
  );
  const caseHashChanged = !reviewMapsEqual(planned.caseHash, loaded.snapshot.caseHash);
  if (caseReviewChanged) metaPatch.field_review_status = planned.caseReview;
  if (caseHashChanged) metaPatch.field_content_hash = planned.caseHash;
  if (Object.keys(metaPatch).length > 0) {
    const { error } = await supabase.from('tp_meta').upsert(
      [{ employee_id: employeeId, ...metaPatch }],
      { onConflict: 'employee_id' }
    );
    if (error) return { ...planned, error: error.message };
  }

  return planned;
}

export function isWorkerFactKey(key: string): key is WorkerFactKey {
  return WORKER_FACT_KEY_SET.has(key);
}
