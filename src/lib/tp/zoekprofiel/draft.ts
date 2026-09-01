export type ZoekprofielClarificationDraft = {
  version: 1;
  status: 'awaiting_answer' | 'ready' | 'finalized';
  pendingQuestion?: string;
  answerHistory: { question: string; answer: string }[];
  pendingZoekprofiel?: string;
  generationRound: number;
  finalizedAt?: string | null;
};

export function createEmptyDraft(): ZoekprofielClarificationDraft {
  return {
    version: 1,
    status: 'ready',
    answerHistory: [],
    generationRound: 0,
    finalizedAt: null,
  };
}

export function parseDraft(raw: unknown): ZoekprofielClarificationDraft {
  if (!raw || typeof raw !== 'object') return createEmptyDraft();
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return createEmptyDraft();

  const answerHistory: ZoekprofielClarificationDraft['answerHistory'] = [];
  if (Array.isArray(o.answerHistory)) {
    for (const item of o.answerHistory) {
      if (!item || typeof item !== 'object') continue;
      const h = item as Record<string, unknown>;
      const question = String(h.question ?? '').trim();
      const answer = String(h.answer ?? '').trim();
      if (question && answer) answerHistory.push({ question, answer });
    }
  }

  const statusRaw = String(o.status ?? 'ready');
  const status: ZoekprofielClarificationDraft['status'] =
    statusRaw === 'awaiting_answer' || statusRaw === 'finalized' || statusRaw === 'ready'
      ? statusRaw
      : 'ready';

  return {
    version: 1,
    status,
    pendingQuestion:
      typeof o.pendingQuestion === 'string' ? o.pendingQuestion.trim() || undefined : undefined,
    answerHistory,
    pendingZoekprofiel:
      typeof o.pendingZoekprofiel === 'string'
        ? o.pendingZoekprofiel.trim() || undefined
        : undefined,
    generationRound: Math.max(0, Number(o.generationRound) || 0),
    finalizedAt:
      o.finalizedAt === null || typeof o.finalizedAt === 'string' ? o.finalizedAt : null,
  };
}

export function draftAwaitingQuestion(
  question: string,
  options?: { round?: number; history?: ZoekprofielClarificationDraft['answerHistory'] }
): ZoekprofielClarificationDraft {
  return {
    version: 1,
    status: 'awaiting_answer',
    pendingQuestion: question.trim(),
    answerHistory: options?.history ?? [],
    generationRound: options?.round ?? 1,
    finalizedAt: null,
  };
}

export function draftWithPreview(
  zoekprofiel: string,
  options?: { round?: number; history?: ZoekprofielClarificationDraft['answerHistory'] }
): ZoekprofielClarificationDraft {
  return {
    version: 1,
    status: 'ready',
    pendingZoekprofiel: zoekprofiel.trim(),
    answerHistory: options?.history ?? [],
    generationRound: options?.round ?? 1,
    finalizedAt: null,
  };
}

export function appendAnswer(
  draft: ZoekprofielClarificationDraft,
  question: string,
  answer: string
): ZoekprofielClarificationDraft {
  return {
    ...draft,
    status: 'ready',
    pendingQuestion: undefined,
    answerHistory: [
      ...draft.answerHistory,
      { question: question.trim(), answer: answer.trim() },
    ],
    generationRound: draft.generationRound + 1,
    finalizedAt: null,
  };
}

export function markDraftFinalized(
  draft: ZoekprofielClarificationDraft
): ZoekprofielClarificationDraft {
  return {
    ...draft,
    status: 'finalized',
    finalizedAt: new Date().toISOString(),
  };
}
