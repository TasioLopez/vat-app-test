import { parseAutofillResponseBody } from '@/lib/autofill-response';

export type AutofillProgressState = {
  currentIndex: number;
  total: number;
  currentLabel: string;
};

export type AutofillProgressEvent = {
  type: 'progress';
  currentIndex: number;
  total: number;
  currentLabel: string;
};

export type AutofillResultEvent = {
  type: 'result';
  [key: string]: unknown;
};

export type AutofillErrorEvent = {
  type: 'error';
  error: string;
  status?: number;
};

export type AutofillStreamEvent =
  | AutofillProgressEvent
  | AutofillResultEvent
  | AutofillErrorEvent;

export const AUTOFILL_SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;

const encoder = new TextEncoder();

export function encodeSseData(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export function encodeProgressEvent(progress: AutofillProgressState): Uint8Array {
  return encodeSseData({
    type: 'progress',
    currentIndex: progress.currentIndex,
    total: progress.total,
    currentLabel: progress.currentLabel,
  } satisfies AutofillProgressEvent);
}

export function encodeResultEvent(payload: Record<string, unknown>): Uint8Array {
  return encodeSseData({ type: 'result', ...payload } satisfies AutofillResultEvent);
}

export function encodeErrorEvent(error: string, status?: number): Uint8Array {
  return encodeSseData({
    type: 'error',
    error,
    ...(typeof status === 'number' ? { status } : {}),
  } satisfies AutofillErrorEvent);
}

export type AutofillProgressReporter = (progress: AutofillProgressState) => void;

/** Build a 1-based progress reporter for a fixed step list. */
export function createStepProgressReporter(
  steps: string[],
  onProgress?: AutofillProgressReporter
): (stepIndex0: number) => void {
  const total = steps.length;
  return (stepIndex0: number) => {
    if (!onProgress || total === 0) return;
    const i = Math.max(0, Math.min(stepIndex0, total - 1));
    onProgress({
      currentIndex: i + 1,
      total,
      currentLabel: steps[i] ?? 'Bezig…',
    });
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseAutofillStreamEvent(raw: string): AutofillStreamEvent | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '[DONE]') return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed) || typeof parsed.type !== 'string') return null;
    if (parsed.type === 'progress') {
      if (
        typeof parsed.currentIndex !== 'number' ||
        typeof parsed.total !== 'number' ||
        typeof parsed.currentLabel !== 'string'
      ) {
        return null;
      }
      return {
        type: 'progress',
        currentIndex: parsed.currentIndex,
        total: parsed.total,
        currentLabel: parsed.currentLabel,
      };
    }
    if (parsed.type === 'error') {
      return {
        type: 'error',
        error: typeof parsed.error === 'string' ? parsed.error : 'Automatisch invullen mislukt',
        status: typeof parsed.status === 'number' ? parsed.status : undefined,
      };
    }
    if (parsed.type === 'result') {
      return parsed as AutofillResultEvent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Consume an autofill SSE (or fall back to a single JSON body).
 * Calls onProgress for each progress event; returns the result payload (without `type`).
 */
export async function consumeAutofillProgressStream(
  res: Response,
  onProgress?: AutofillProgressReporter
): Promise<Record<string, unknown>> {
  const contentType = res.headers.get('content-type') || '';
  const isEventStream = contentType.includes('text/event-stream');

  if (!isEventStream) {
    const bodyText = await res.text();
    const parsed = parseAutofillResponseBody(res.status, bodyText);
    if (!parsed.ok) {
      const err = new Error(parsed.error) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return parsed.json;
  }

  if (!res.body) {
    throw new Error('Lege response van server');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let resultPayload: Record<string, unknown> | null = null;
  let streamError: (Error & { status?: number }) | null = null;

  const handleDataLine = (data: string) => {
    const event = parseAutofillStreamEvent(data);
    if (!event) return;
    if (event.type === 'progress') {
      onProgress?.({
        currentIndex: event.currentIndex,
        total: event.total,
        currentLabel: event.currentLabel,
      });
      return;
    }
    if (event.type === 'error') {
      const err = new Error(event.error) as Error & { status?: number };
      err.status = event.status;
      streamError = err;
      return;
    }
    if (event.type === 'result') {
      const { type: _type, ...rest } = event;
      resultPayload = rest;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          handleDataLine(trimmed.slice(5).trim());
        }
      }
    }
  }

  if (buffer.trim()) {
    for (const line of buffer.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        handleDataLine(trimmed.slice(5).trim());
      }
    }
  }

  if (streamError) throw streamError;
  if (!resultPayload) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    throw new Error('Geen resultaat van automatisch invullen');
  }
  return resultPayload;
}
