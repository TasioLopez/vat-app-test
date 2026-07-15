import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GotenbergConversionError } from '../gotenberg-errors';
import { normalizeForAnalysis, getGotenbergUrl } from '../normalizeForAnalysis';

describe('normalizeForAnalysis', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.GOTENBERG_URL;
  const originalApiKey = process.env.GOTENBERG_API_KEY;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.GOTENBERG_URL;
    } else {
      process.env.GOTENBERG_URL = originalEnv;
    }
    if (originalApiKey === undefined) {
      delete process.env.GOTENBERG_API_KEY;
    } else {
      process.env.GOTENBERG_API_KEY = originalApiKey;
    }
  });

  it('passes PDF through unchanged', async () => {
    const buf = Buffer.from('%PDF-1.4 test');
    const result = await normalizeForAnalysis(buf, 'intake.pdf');
    assert.equal(result.wasConverted, false);
    assert.equal(result.analysisFilename, 'intake.pdf');
    assert.equal(result.pdfBuffer, buf);
  });

  it('throws GotenbergConversionError when DOCX and GOTENBERG_URL missing', async () => {
    delete process.env.GOTENBERG_URL;
    await assert.rejects(
      () => normalizeForAnalysis(Buffer.from('PK'), 'form.docx'),
      (err: unknown) => {
        assert.ok(err instanceof GotenbergConversionError);
        assert.match(String(err.message), /GOTENBERG_URL is not configured/);
        return true;
      }
    );
  });

  it('converts DOCX via Gotenberg', async () => {
    process.env.GOTENBERG_URL = 'https://gotenberg.example.com';
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      arrayBuffer: async () => Buffer.from('%PDF-converted').buffer,
    })) as typeof fetch;

    const result = await normalizeForAnalysis(Buffer.from('PK'), 'intake.docx');
    assert.equal(result.wasConverted, true);
    assert.equal(result.analysisFilename, 'intake.pdf');
    assert.ok(result.pdfBuffer.length > 10);
  });

  it('sends Authorization header when GOTENBERG_API_KEY is set', async () => {
    process.env.GOTENBERG_URL = 'https://gotenberg.example.com';
    process.env.GOTENBERG_API_KEY = 'secret-key';
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = mock.fn(async (_url, init) => {
      capturedHeaders = init?.headers;
      return {
        ok: true,
        arrayBuffer: async () => Buffer.from('%PDF-converted').buffer,
      };
    }) as typeof fetch;

    await normalizeForAnalysis(Buffer.from('PK'), 'intake.docx');
    assert.equal(capturedHeaders?.Authorization, 'Bearer secret-key');
  });

  it('throws GotenbergConversionError on timeout (AbortError)', async () => {
    process.env.GOTENBERG_URL = 'https://gotenberg.example.com';
    globalThis.fetch = mock.fn(async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    }) as typeof fetch;

    await assert.rejects(
      () => normalizeForAnalysis(Buffer.from('PK'), 'form.docx'),
      (err: unknown) => {
        assert.ok(err instanceof GotenbergConversionError);
        assert.match(String(err.message), /timed out/);
        return true;
      }
    );
  });

  it('getGotenbergUrl strips trailing slash', () => {
    process.env.GOTENBERG_URL = 'https://gotenberg.example.com/';
    assert.equal(getGotenbergUrl(), 'https://gotenberg.example.com');
  });
});
