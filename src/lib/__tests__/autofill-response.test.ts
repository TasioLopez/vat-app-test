import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAutofillResponseBody } from '@/lib/autofill-response';

describe('parseAutofillResponseBody', () => {
  it('parses successful JSON', () => {
    const result = parseAutofillResponseBody(
      200,
      JSON.stringify({ success: true, details: { transport_type: ['Auto'] } })
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.json.success, true);
    }
  });

  it('maps Vercel timeout text to Dutch message', () => {
    const result = parseAutofillResponseBody(
      504,
      'An error occurred with your deployment\n\nFUNCTION_INVOCATION_TIMEOUT\n'
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /time-out/i);
      assert.equal(result.error.includes('Unexpected token'), false);
    }
  });

  it('maps non-JSON 500 body to timeout-style message', () => {
    const result = parseAutofillResponseBody(500, 'An error occurred with your deployment');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /time-out|opnieuw/i);
    }
  });

  it('surfaces JSON error field on 4xx', () => {
    const result = parseAutofillResponseBody(
      400,
      JSON.stringify({ error: 'employeeId is verplicht' })
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, 'employeeId is verplicht');
    }
  });
});
