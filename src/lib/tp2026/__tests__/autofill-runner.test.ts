import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAutofillAbortError,
  resolveTp3AutofillJson,
  runAutofillSteps,
  type AutofillRunStep,
} from '../autofill-runner';

const ctx = {
  employeeId: 'emp-1',
  supabase: {} as never,
};

describe('isAutofillAbortError', () => {
  it('detects AbortError', () => {
    assert.equal(isAutofillAbortError(new DOMException('aborted', 'AbortError')), true);
    assert.equal(isAutofillAbortError(Object.assign(new Error('aborted'), { name: 'AbortError' })), true);
    assert.equal(isAutofillAbortError(new Error('other')), false);
  });
});

describe('resolveTp3AutofillJson', () => {
  it('returns error without merging when API responds 200 with empty details', () => {
    const current = { zoekprofiel: 'bestaand' };
    const result = resolveTp3AutofillJson(
      { error: 'Geen FML/IZP document gevonden', details: {} },
      current
    );

    assert.equal(result.error, 'Geen FML/IZP document gevonden');
    assert.equal(result.data.zoekprofiel, 'bestaand');
  });

  it('merges details and keeps error for partial responses', () => {
    const current = { zoekprofiel: '' };
    const result = resolveTp3AutofillJson(
      { error: 'Waarschuwing', details: { zoekprofiel: 'Nieuw profiel' } },
      current
    );

    assert.equal(result.error, 'Waarschuwing');
    assert.equal(result.data.zoekprofiel, 'Nieuw profiel');
  });

  it('does not fail the step on soft warnings when details are present', () => {
    const current = { zoekprofiel: '' };
    const result = resolveTp3AutofillJson(
      {
        details: { zoekprofiel: 'AD-only profiel' },
        warnings: ['Zoekprofiel gegenereerd zonder apart FML/IZP/LAB-document'],
      },
      current
    );

    assert.equal(result.error, undefined);
    assert.equal(result.data.zoekprofiel, 'AD-only profiel');
  });

  it('persists clarification draft without overwriting zoekprofiel', () => {
    const current = { zoekprofiel: 'bestaand zoekprofiel' };
    const draft = {
      version: 1,
      status: 'awaiting_answer',
      pendingQuestion: 'Welke opleiding?',
      answerHistory: [],
      generationRound: 1,
    };
    const result = resolveTp3AutofillJson(
      {
        requires_clarification: true,
        clarification_question: 'Welke opleiding?',
        details: { zoekprofiel_clarification_draft: draft },
      },
      current
    );

    // Soft outcome — does not fail autofill / Autofill mislukt
    assert.equal(result.error, undefined);
    assert.equal(result.data.zoekprofiel, 'bestaand zoekprofiel');
    assert.deepEqual(result.data.zoekprofiel_clarification_draft, draft);
  });
});

describe('runAutofillSteps cancel', () => {
  it('returns snapshot when cancelled before first step', async () => {
    const initial = { foo: 'bar', inleiding: '' };
    const steps: AutofillRunStep[] = [
      {
        id: 'a',
        label: 'Step A',
        run: async (_ctx, data) => ({ data: { ...data, foo: 'changed' } }),
      },
    ];

    const result = await runAutofillSteps(steps, ctx, initial, {
      onProgress: () => {},
      shouldCancel: () => true,
    });

    assert.equal(result.cancelled, true);
    assert.deepEqual(result.data, initial);
    assert.equal(result.completed, 0);
    assert.equal(result.failed.length, 0);
  });

  it('returns snapshot when cancelled after first step of two', async () => {
    const initial = { step: 0 };
    let ranSecond = false;
    let cancelPending = false;
    const steps: AutofillRunStep[] = [
      {
        id: 'one',
        label: 'One',
        run: async (_ctx, data) => {
          cancelPending = true;
          return { data: { ...data, step: 1 } };
        },
      },
      {
        id: 'two',
        label: 'Two',
        run: async (_ctx, data) => {
          ranSecond = true;
          return { data: { ...data, step: 2 } };
        },
      },
    ];

    const result = await runAutofillSteps(steps, ctx, initial, {
      onProgress: () => {},
      shouldCancel: () => cancelPending,
    });

    assert.equal(result.cancelled, true);
    assert.deepEqual(result.data, initial);
    assert.equal(result.completed, 0);
    assert.equal(ranSecond, false);
  });

  it('returns snapshot when step throws AbortError', async () => {
    const initial = { value: 'original' };
    const steps: AutofillRunStep[] = [
      {
        id: 'abort',
        label: 'Abort',
        run: async () => {
          throw new DOMException('The operation was aborted.', 'AbortError');
        },
      },
    ];

    const result = await runAutofillSteps(steps, ctx, initial, {
      onProgress: () => {},
    });

    assert.equal(result.cancelled, true);
    assert.deepEqual(result.data, initial);
    assert.equal(result.completed, 0);
  });

  it('returns employeePersist payload on successful employee step', async () => {
    const initial = { gender: '' };
    const steps: AutofillRunStep[] = [
      {
        id: 'employee',
        label: 'Employee',
        run: async (_ctx, data) => ({
          data: { ...data, gender: 'female' },
          employeePersist: {
            rawDetails: { gender: 'female' },
            meta: { autofill_incomplete: true, autofill_warnings: [{ message: 'check transport' }] },
          },
        }),
      },
    ];

    const result = await runAutofillSteps(steps, ctx, initial, {
      onProgress: () => {},
    });

    assert.equal(result.cancelled, false);
    assert.equal(result.completed, 1);
    assert.equal(result.data.gender, 'female');
    assert.deepEqual(result.employeePersist?.rawDetails, { gender: 'female' });
    assert.equal(result.employeePersist?.meta?.autofill_incomplete, true);
  });

  it('keeps the worker proposal and skipped validated fields for the confirm dialog', async () => {
    const initial = { education_level: 'HBO' };
    const steps: AutofillRunStep[] = [
      {
        id: 'employee',
        label: 'Employee',
        run: async (_ctx, data) => ({
          data: { ...data, education_level: 'HBO' },
          factProposal: { education_level: 'MBO 4', phone: '0611111111' },
          skippedValidated: [{ key: 'education_level', current: 'HBO', proposed: 'MBO 4' }],
        }),
      },
      {
        id: 'tp2',
        label: 'TP2',
        run: async (_ctx, data) => ({
          data,
          factProposal: { first_sick_day: '2026-02-02' },
          skippedValidated: [{ key: 'intake_date', current: '2026-01-01', proposed: '2026-03-03' }],
        }),
      },
    ];

    const result = await runAutofillSteps(steps, ctx, initial, { onProgress: () => {} });

    assert.equal(result.factProposal?.education_level, 'MBO 4');
    assert.equal(result.factProposal?.phone, '0611111111');
    assert.equal(result.factProposal?.first_sick_day, '2026-02-02');
    assert.equal(result.skippedValidated?.length, 2);
    assert.equal(result.data.education_level, 'HBO');
  });
});
