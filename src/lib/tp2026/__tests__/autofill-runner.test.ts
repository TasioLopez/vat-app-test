import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAutofillAbortError,
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
});
