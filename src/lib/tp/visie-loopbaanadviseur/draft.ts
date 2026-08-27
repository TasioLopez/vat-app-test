import { FUNCTIE_SUGGESTION_BATCH_SIZE } from './constants';
import type { VisieLoopbaanFunctie } from './schema';

export type FunctieSuggestionStatus = 'pending' | 'kept' | 'rejected';

export type FunctieSuggestion = {
  id: string;
  naam: string;
  toelichting: string;
  status: FunctieSuggestionStatus;
  batchId: string;
};

export type VisieLaFunctieDraft = {
  version: 1;
  suggestions: FunctieSuggestion[];
  generationRound: number;
  lastFeedback?: string;
  finalizedAt?: string | null;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyDraft(): VisieLaFunctieDraft {
  return {
    version: 1,
    suggestions: [],
    generationRound: 0,
    finalizedAt: null,
  };
}

export function parseDraft(raw: unknown): VisieLaFunctieDraft {
  if (!raw || typeof raw !== 'object') return createEmptyDraft();
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return createEmptyDraft();

  const suggestions: FunctieSuggestion[] = [];
  if (Array.isArray(o.suggestions)) {
    for (const item of o.suggestions) {
      if (!item || typeof item !== 'object') continue;
      const s = item as Record<string, unknown>;
      const naam = String(s.naam ?? '').trim();
      if (!naam) continue;
      const statusRaw = String(s.status ?? 'pending');
      const status: FunctieSuggestionStatus =
        statusRaw === 'kept' || statusRaw === 'rejected' || statusRaw === 'pending'
          ? statusRaw
          : 'pending';
      suggestions.push({
        id: String(s.id ?? newId()),
        naam,
        toelichting: String(s.toelichting ?? '').trim(),
        status,
        batchId: String(s.batchId ?? 'legacy'),
      });
    }
  }

  return {
    version: 1,
    suggestions,
    generationRound: Math.max(0, Number(o.generationRound) || 0),
    lastFeedback: typeof o.lastFeedback === 'string' ? o.lastFeedback : undefined,
    finalizedAt:
      o.finalizedAt === null || typeof o.finalizedAt === 'string' ? o.finalizedAt : null,
  };
}

export function draftFromGeneratedBatch(
  functies: VisieLoopbaanFunctie[],
  options?: { status?: FunctieSuggestionStatus; round?: number }
): VisieLaFunctieDraft {
  const batchId = newId();
  const status = options?.status ?? 'kept';
  const round = options?.round ?? 1;
  return {
    version: 1,
    suggestions: functies
      .filter((f) => f.naam.trim())
      .map((f) => ({
        id: newId(),
        naam: f.naam.trim(),
        toelichting: f.toelichting.trim(),
        status,
        batchId,
      })),
    generationRound: round,
    finalizedAt: null,
  };
}

export function getKeptFuncties(draft: VisieLaFunctieDraft): VisieLoopbaanFunctie[] {
  return draft.suggestions
    .filter((s) => s.status === 'kept')
    .map((s) => ({ naam: s.naam, toelichting: s.toelichting }));
}

export function getRejectedNames(draft: VisieLaFunctieDraft): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const s of draft.suggestions) {
    if (s.status !== 'rejected') continue;
    const key = s.naam.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(s.naam.trim());
  }
  return names;
}

export function getPendingSuggestions(draft: VisieLaFunctieDraft): FunctieSuggestion[] {
  return draft.suggestions.filter((s) => s.status === 'pending');
}

/**
 * Before regenerating: mark all current pending items as rejected (unchecked = rejected).
 */
export function rejectPendingSuggestions(draft: VisieLaFunctieDraft): VisieLaFunctieDraft {
  return {
    ...draft,
    suggestions: draft.suggestions.map((s) =>
      s.status === 'pending' ? { ...s, status: 'rejected' as const } : s
    ),
  };
}

/**
 * Merge a new AI batch: keep kept + rejected history, replace pending with new batch.
 */
export function mergeRegenerationBatch(
  draft: VisieLaFunctieDraft,
  newFuncties: VisieLoopbaanFunctie[],
  options?: { userFeedback?: string }
): VisieLaFunctieDraft {
  const withRejectedPending = rejectPendingSuggestions(draft);
  const batchId = newId();
  const keptAndRejected = withRejectedPending.suggestions.filter(
    (s) => s.status === 'kept' || s.status === 'rejected'
  );
  const pending: FunctieSuggestion[] = newFuncties
    .filter((f) => f.naam.trim())
    .slice(0, FUNCTIE_SUGGESTION_BATCH_SIZE)
    .map((f) => ({
      id: newId(),
      naam: f.naam.trim(),
      toelichting: f.toelichting.trim(),
      status: 'pending' as const,
      batchId,
    }));

  return {
    version: 1,
    suggestions: [...keptAndRejected, ...pending],
    generationRound: withRejectedPending.generationRound + 1,
    lastFeedback: options?.userFeedback?.trim() || withRejectedPending.lastFeedback,
    finalizedAt: null,
  };
}

export function toggleSuggestionStatus(
  draft: VisieLaFunctieDraft,
  suggestionId: string,
  status: FunctieSuggestionStatus
): VisieLaFunctieDraft {
  return {
    ...draft,
    suggestions: draft.suggestions.map((s) =>
      s.id === suggestionId ? { ...s, status } : s
    ),
    finalizedAt: null,
  };
}

export function updateSuggestionFields(
  draft: VisieLaFunctieDraft,
  suggestionId: string,
  patch: Partial<Pick<FunctieSuggestion, 'naam' | 'toelichting'>>
): VisieLaFunctieDraft {
  return {
    ...draft,
    suggestions: draft.suggestions.map((s) =>
      s.id === suggestionId
        ? {
            ...s,
            ...(patch.naam !== undefined ? { naam: patch.naam } : {}),
            ...(patch.toelichting !== undefined ? { toelichting: patch.toelichting } : {}),
          }
        : s
    ),
    finalizedAt: null,
  };
}

export function markDraftFinalized(draft: VisieLaFunctieDraft): VisieLaFunctieDraft {
  return {
    ...draft,
    finalizedAt: new Date().toISOString(),
  };
}

/** Sync kept list from manual bullet edits (best-effort). */
export function draftFromKeptFuncties(
  draft: VisieLaFunctieDraft,
  kept: VisieLoopbaanFunctie[]
): VisieLaFunctieDraft {
  const batchId = draft.suggestions.find((s) => s.status === 'kept')?.batchId ?? newId();
  const rejected = draft.suggestions.filter((s) => s.status === 'rejected');
  const pending = draft.suggestions.filter((s) => s.status === 'pending');
  const keptSuggestions: FunctieSuggestion[] = kept
    .filter((f) => f.naam.trim())
    .map((f) => ({
      id: newId(),
      naam: f.naam.trim(),
      toelichting: f.toelichting.trim(),
      status: 'kept' as const,
      batchId,
    }));
  return {
    ...draft,
    suggestions: [...keptSuggestions, ...pending, ...rejected],
    finalizedAt: null,
  };
}
