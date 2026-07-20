export type AutofillJsonParseResult =
  | { ok: true; json: Record<string, unknown> }
  | { ok: false; error: string };

const TIMEOUT_MESSAGE =
  'Autofill is afgebroken door een time-out. Probeer het opnieuw — meestal lukt het binnen twee minuten.';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/** Normalize autofill payloads that nest details under `data` or at the top level. */
export function getAutofillDetailsPayload(json: Record<string, unknown>): {
  details: Record<string, unknown> | undefined;
  data: Record<string, unknown>;
} {
  const nested = asRecord(json.data);
  const details =
    asRecord(json.details) ?? (nested ? asRecord(nested.details) : undefined);
  return { details, data: nested ?? json };
}

/**
 * Parse autofill API body safely. Vercel timeouts return plain text
 * (FUNCTION_INVOCATION_TIMEOUT), not JSON — never throw Unexpected token.
 */
export function parseAutofillResponseBody(
  status: number,
  bodyText: string
): AutofillJsonParseResult {
  const trimmed = (bodyText || '').trim();

  if (
    status === 504 ||
    status === 502 ||
    /FUNCTION_INVOCATION_TIMEOUT/i.test(trimmed) ||
    /Task timed out/i.test(trimmed) ||
    /An error occurred with your deployment/i.test(trimmed)
  ) {
    return { ok: false, error: TIMEOUT_MESSAGE };
  }

  if (!trimmed) {
    return {
      ok: false,
      error: status >= 400 ? `HTTP ${status}: lege response` : 'Lege response van server',
    };
  }

  try {
    const json = JSON.parse(trimmed) as unknown;
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return { ok: false, error: 'Ongeldige JSON-response van server' };
    }
    const record = json as Record<string, unknown>;
    if (status >= 400) {
      const msg =
        typeof record.error === 'string' && record.error.trim()
          ? record.error
          : `HTTP ${status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, json: record };
  } catch {
    if (status >= 500) {
      return { ok: false, error: TIMEOUT_MESSAGE };
    }
    return {
      ok: false,
      error: 'Server gaf geen geldige JSON terug. Probeer het opnieuw.',
    };
  }
}

export async function readAutofillResponse(
  res: Response
): Promise<AutofillJsonParseResult> {
  const bodyText = await res.text();
  return parseAutofillResponseBody(res.status, bodyText);
}
