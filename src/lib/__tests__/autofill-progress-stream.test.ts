import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  consumeAutofillProgressStream,
  createStepProgressReporter,
  encodeErrorEvent,
  encodeProgressEvent,
  encodeResultEvent,
  parseAutofillStreamEvent,
} from '@/lib/autofill-progress-stream';
import {
  EMPLOYEE_AUTOFILL_CHATLIKE_STEPS,
  INTAKE_AUTOFILL_STEPS_DOSSIER_ONLY,
  INTAKE_AUTOFILL_STEPS_WITH_PDF,
} from '@/lib/autofill-progress';

describe('autofill progress step lists', () => {
  it('reserves opslaan as the last intake step', () => {
    assert.equal(INTAKE_AUTOFILL_STEPS_WITH_PDF.at(-1), 'Gegevens opslaan…');
    assert.equal(INTAKE_AUTOFILL_STEPS_DOSSIER_ONLY.at(-1), 'Gegevens opslaan…');
    assert.ok(INTAKE_AUTOFILL_STEPS_WITH_PDF.length >= 8);
    assert.equal(EMPLOYEE_AUTOFILL_CHATLIKE_STEPS.length, 4);
  });
});

describe('createStepProgressReporter', () => {
  it('emits 1-based indexes with labels', () => {
    const seen: { currentIndex: number; total: number; currentLabel: string }[] = [];
    const report = createStepProgressReporter(['A…', 'B…', 'C…'], (p) => seen.push(p));
    report(0);
    report(2);
    assert.deepEqual(seen, [
      { currentIndex: 1, total: 3, currentLabel: 'A…' },
      { currentIndex: 3, total: 3, currentLabel: 'C…' },
    ]);
  });
});

describe('parseAutofillStreamEvent', () => {
  it('parses progress / result / error payloads', () => {
    assert.deepEqual(
      parseAutofillStreamEvent(
        JSON.stringify({
          type: 'progress',
          currentIndex: 2,
          total: 5,
          currentLabel: 'Test…',
        })
      ),
      { type: 'progress', currentIndex: 2, total: 5, currentLabel: 'Test…' }
    );
    const result = parseAutofillStreamEvent(
      JSON.stringify({ type: 'result', ok: true, data_json: { a: 1 } })
    );
    assert.equal(result?.type, 'result');
    assert.equal((result as { ok?: boolean }).ok, true);
    assert.deepEqual(
      parseAutofillStreamEvent(JSON.stringify({ type: 'error', error: 'Nope', status: 404 })),
      { type: 'error', error: 'Nope', status: 404 }
    );
  });
});

describe('consumeAutofillProgressStream', () => {
  it('reads SSE progress then returns result payload', async () => {
    const chunks = [
      encodeProgressEvent({ currentIndex: 1, total: 2, currentLabel: 'Eerste…' }),
      encodeProgressEvent({ currentIndex: 2, total: 2, currentLabel: 'Tweede…' }),
      encodeResultEvent({ ok: true, value: 42 }),
    ];
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    const progress: string[] = [];
    const res = new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
    const json = await consumeAutofillProgressStream(res, (p) => progress.push(p.currentLabel));
    assert.deepEqual(progress, ['Eerste…', 'Tweede…']);
    assert.equal(json.ok, true);
    assert.equal(json.value, 42);
    assert.equal(json.type, undefined);
  });

  it('throws on stream error events', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encodeErrorEvent('Geen intakeformulier', 404));
        controller.close();
      },
    });
    const res = new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });
    await assert.rejects(
      () => consumeAutofillProgressStream(res),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'Geen intakeformulier');
        assert.equal((err as Error & { status?: number }).status, 404);
        return true;
      }
    );
  });

  it('falls back to JSON bodies for non-SSE responses', async () => {
    const res = new Response(JSON.stringify({ success: true, data: { details: { a: 1 } } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await consumeAutofillProgressStream(res);
    assert.equal(json.success, true);
  });
});
