import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForAnalysis, getGotenbergUrl } from '../normalizeForAnalysis';

describe('normalizeForAnalysis', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.GOTENBERG_URL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.GOTENBERG_URL;
    } else {
      process.env.GOTENBERG_URL = originalEnv;
    }
  });

  it('passes PDF through unchanged', async () => {
    const buf = Buffer.from('%PDF-1.4 test');
    const result = await normalizeForAnalysis(buf, 'intake.pdf');
    assert.equal(result.wasConverted, false);
    assert.equal(result.analysisFilename, 'intake.pdf');
    assert.equal(result.pdfBuffer, buf);
  });

  it('throws when DOCX and GOTENBERG_URL missing', async () => {
    delete process.env.GOTENBERG_URL;
    await assert.rejects(
      () => normalizeForAnalysis(Buffer.from('PK'), 'form.docx'),
      /GOTENBERG_URL is not configured/
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

  it('getGotenbergUrl strips trailing slash', () => {
    process.env.GOTENBERG_URL = 'https://gotenberg.example.com/';
    assert.equal(getGotenbergUrl(), 'https://gotenberg.example.com');
  });
});
