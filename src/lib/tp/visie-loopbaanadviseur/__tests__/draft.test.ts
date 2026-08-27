import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyDraft,
  draftFromGeneratedBatch,
  getKeptFuncties,
  getRejectedNames,
  markDraftFinalized,
  mergeRegenerationBatch,
  parseDraft,
  rejectPendingSuggestions,
  toggleSuggestionStatus,
} from '../draft';

describe('visie LA functie draft', () => {
  it('createEmptyDraft has version 1 and empty suggestions', () => {
    const d = createEmptyDraft();
    assert.equal(d.version, 1);
    assert.equal(d.suggestions.length, 0);
    assert.equal(d.generationRound, 0);
  });

  it('draftFromGeneratedBatch seeds kept or pending', () => {
    const kept = draftFromGeneratedBatch(
      [
        { naam: 'A', toelichting: '1' },
        { naam: 'B', toelichting: '2' },
      ],
      { status: 'kept', round: 1 }
    );
    assert.equal(kept.suggestions.length, 2);
    assert.ok(kept.suggestions.every((s) => s.status === 'kept'));
    assert.equal(kept.generationRound, 1);

    const pending = draftFromGeneratedBatch(
      [{ naam: 'C', toelichting: '3' }],
      { status: 'pending', round: 1 }
    );
    assert.equal(pending.suggestions[0].status, 'pending');
  });

  it('mergeRegenerationBatch rejects pending and appends new pending', () => {
    let draft = draftFromGeneratedBatch(
      [
        { naam: 'Keep me', toelichting: 'ok' },
        { naam: 'Drop me', toelichting: 'no' },
        { naam: 'Also drop', toelichting: 'no' },
      ],
      { status: 'pending', round: 1 }
    );
    draft = toggleSuggestionStatus(draft, draft.suggestions[0].id, 'kept');

    const merged = mergeRegenerationBatch(
      draft,
      [
        { naam: 'New 1', toelichting: 'a' },
        { naam: 'New 2', toelichting: 'b' },
      ],
      { userFeedback: 'Meer admin' }
    );

    assert.equal(getKeptFuncties(merged).length, 1);
    assert.equal(getKeptFuncties(merged)[0].naam, 'Keep me');
    assert.deepEqual(getRejectedNames(merged).sort(), ['Also drop', 'Drop me'].sort());
    assert.equal(merged.suggestions.filter((s) => s.status === 'pending').length, 2);
    assert.equal(merged.generationRound, 2);
    assert.equal(merged.lastFeedback, 'Meer admin');
  });

  it('rejectPendingSuggestions marks only pending as rejected', () => {
    let draft = draftFromGeneratedBatch(
      [
        { naam: 'K', toelichting: '' },
        { naam: 'P', toelichting: '' },
      ],
      { status: 'pending' }
    );
    draft = toggleSuggestionStatus(draft, draft.suggestions[0].id, 'kept');
    const rejected = rejectPendingSuggestions(draft);
    assert.equal(rejected.suggestions.find((s) => s.naam === 'K')?.status, 'kept');
    assert.equal(rejected.suggestions.find((s) => s.naam === 'P')?.status, 'rejected');
  });

  it('parseDraft recovers valid drafts and falls back on garbage', () => {
    const original = draftFromGeneratedBatch([{ naam: 'X', toelichting: 'y' }], {
      status: 'kept',
    });
    const roundTripped = parseDraft(JSON.parse(JSON.stringify(original)));
    assert.equal(roundTripped.suggestions[0].naam, 'X');
    assert.equal(parseDraft(null).suggestions.length, 0);
    assert.equal(parseDraft({ version: 99 }).suggestions.length, 0);
  });

  it('markDraftFinalized sets finalizedAt', () => {
    const d = markDraftFinalized(createEmptyDraft());
    assert.ok(typeof d.finalizedAt === 'string' && d.finalizedAt.length > 0);
  });
});
