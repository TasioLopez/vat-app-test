import {
  BASIS_EDITOR_SECTION_IDS,
  type BasisEditorSectionId,
  isBasisEditorSectionId,
} from '@/lib/tp2026/basis-editor-sections';
import { normalizeTp3Activities, resolveSpoor2Selections } from '@/lib/tp/tp_activities';

export type BasisSectionReviewStatus = 'review' | 'validated';
export type BasisSectionDisplayStatus = 'empty' | 'review' | 'validated';

export const BASIS_SECTION_REVIEW_FIELD = 'basis_section_review';
export const BASIS_SECTION_HASH_FIELD = 'basis_section_content_hash';

export const BASIS_SECTION_STATUS_LABELS: Record<BasisSectionDisplayStatus, string> = {
  empty: 'Leeg',
  review: 'Te controleren',
  validated: 'Gevalideerd',
};

export const BASIS_SECTION_STATUS_BORDER: Record<BasisSectionDisplayStatus, string> = {
  empty: 'border-gray-200',
  review: 'border-amber-400',
  validated: 'border-green-500',
};

export type BasisSectionReviewMap = Partial<Record<BasisEditorSectionId, BasisSectionReviewStatus>>;
export type BasisSectionContentHashMap = Partial<Record<BasisEditorSectionId, string>>;

export function normalizeBasisSectionReview(raw: unknown): BasisSectionReviewMap {
  if (!raw || typeof raw !== 'object') return {};
  const allowed = new Set<string>(BASIS_EDITOR_SECTION_IDS);
  const result: BasisSectionReviewMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(key)) continue;
    if (value === 'review' || value === 'validated') {
      result[key as BasisEditorSectionId] = value;
    }
  }
  return result;
}

export function normalizeBasisSectionContentHash(raw: unknown): BasisSectionContentHashMap {
  if (!raw || typeof raw !== 'object') return {};
  const allowed = new Set<string>(BASIS_EDITOR_SECTION_IDS);
  const result: BasisSectionContentHashMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(key)) continue;
    if (typeof value === 'string') {
      result[key as BasisEditorSectionId] = value;
    }
  }
  return result;
}

export function isBasisSectionEmpty(id: BasisEditorSectionId, tpData: Record<string, unknown>): boolean {
  if (id === 'tp3_activities') {
    return Array.isArray(tpData.tp3_activities) && tpData.tp3_activities.length === 0;
  }
  return !String(tpData[id] ?? '').trim();
}

export function computeBasisSectionContentHash(id: BasisEditorSectionId, tpData: Record<string, unknown>): string {
  if (id === 'tp3_activities') {
    return JSON.stringify(resolveSpoor2Selections(tpData.tp3_activities));
  }
  return String(tpData[id] ?? '').trim();
}

export function getBasisSectionDisplayStatus(
  id: BasisEditorSectionId,
  tpData: Record<string, unknown>
): BasisSectionDisplayStatus {
  if (isBasisSectionEmpty(id, tpData)) return 'empty';

  const reviewMap = normalizeBasisSectionReview(tpData[BASIS_SECTION_REVIEW_FIELD]);
  const hashMap = normalizeBasisSectionContentHash(tpData[BASIS_SECTION_HASH_FIELD]);
  const flag = reviewMap[id];
  const currentHash = computeBasisSectionContentHash(id, tpData);
  const storedHash = hashMap[id];

  if (flag === 'validated' && storedHash && storedHash === currentHash) {
    return 'validated';
  }
  return 'review';
}

export function withBasisSectionReview(
  tpData: Record<string, unknown>,
  id: BasisEditorSectionId,
  status: BasisSectionReviewStatus
): Record<string, unknown> {
  const reviewMap = normalizeBasisSectionReview(tpData[BASIS_SECTION_REVIEW_FIELD]);
  return {
    ...tpData,
    [BASIS_SECTION_REVIEW_FIELD]: {
      ...reviewMap,
      [id]: status,
    },
  };
}

export function withBasisSectionValidated(
  tpData: Record<string, unknown>,
  id: BasisEditorSectionId
): Record<string, unknown> {
  const reviewMap = normalizeBasisSectionReview(tpData[BASIS_SECTION_REVIEW_FIELD]);
  const hashMap = normalizeBasisSectionContentHash(tpData[BASIS_SECTION_HASH_FIELD]);
  const hash = computeBasisSectionContentHash(id, tpData);
  return {
    ...tpData,
    [BASIS_SECTION_REVIEW_FIELD]: {
      ...reviewMap,
      [id]: 'validated',
    },
    [BASIS_SECTION_HASH_FIELD]: {
      ...hashMap,
      [id]: hash,
    },
  };
}

export function markBasisSectionReview(
  id: BasisEditorSectionId,
  status: BasisSectionReviewStatus,
  tpData: Record<string, unknown>,
  updateField: (key: string, value: unknown) => void
): void {
  const reviewMap = normalizeBasisSectionReview(tpData[BASIS_SECTION_REVIEW_FIELD]);
  updateField(BASIS_SECTION_REVIEW_FIELD, {
    ...reviewMap,
    [id]: status,
  });
}

export function markBasisSectionValidated(
  id: BasisEditorSectionId,
  tpData: Record<string, unknown>,
  updateField: (key: string, value: unknown) => void
): void {
  const reviewMap = normalizeBasisSectionReview(tpData[BASIS_SECTION_REVIEW_FIELD]);
  const hashMap = normalizeBasisSectionContentHash(tpData[BASIS_SECTION_HASH_FIELD]);
  const hash = computeBasisSectionContentHash(id, tpData);
  updateField(BASIS_SECTION_REVIEW_FIELD, {
    ...reviewMap,
    [id]: 'validated',
  });
  updateField(BASIS_SECTION_HASH_FIELD, {
    ...hashMap,
    [id]: hash,
  });
}

export function applyAutofillReviewMarks(
  tpData: Record<string, unknown>,
  sectionIds: string[]
): Record<string, unknown> {
  let next = tpData;
  for (const sectionId of sectionIds) {
    if (!isBasisEditorSectionId(sectionId)) continue;
    next = withBasisSectionReview(next, sectionId, 'review');
  }
  return next;
}

/** Re-export for tests that assert tp3 normalization behavior. */
export { normalizeTp3Activities };
