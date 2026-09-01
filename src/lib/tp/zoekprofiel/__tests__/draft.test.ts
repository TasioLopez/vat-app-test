import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendAnswer,
  createEmptyDraft,
  draftAwaitingQuestion,
  draftWithPreview,
  markDraftFinalized,
  parseDraft,
} from '../draft';

describe('zoekprofiel draft', () => {
  it('parseDraft returns empty draft for invalid input', () => {
    const d = parseDraft(null);
    assert.equal(d.version, 1);
    assert.equal(d.answerHistory.length, 0);
  });

  it('draftAwaitingQuestion sets status and question', () => {
    const d = draftAwaitingQuestion('Welke opleiding is afgerond?');
    assert.equal(d.status, 'awaiting_answer');
    assert.equal(d.pendingQuestion, 'Welke opleiding is afgerond?');
  });

  it('appendAnswer adds history and clears pending question', () => {
    const start = draftAwaitingQuestion('Vraag?');
    const next = appendAnswer(start, 'Vraag?', 'MBO-2');
    assert.equal(next.status, 'ready');
    assert.equal(next.answerHistory.length, 1);
    assert.equal(next.pendingQuestion, undefined);
    assert.equal(next.generationRound, start.generationRound + 1);
  });

  it('draftWithPreview stores pending zoekprofiel', () => {
    const d = draftWithPreview('Para 1\n\nPara 2');
    assert.equal(d.pendingZoekprofiel, 'Para 1\n\nPara 2');
    assert.equal(d.status, 'ready');
  });

  it('markDraftFinalized sets finalizedAt', () => {
    const d = markDraftFinalized(createEmptyDraft());
    assert.equal(d.status, 'finalized');
    assert.ok(d.finalizedAt);
  });
});
