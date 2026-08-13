import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDocumentStoragePath,
  sanitizeDocumentFileName,
} from '../upload-validation';

describe('sanitizeDocumentFileName', () => {
  it('strips diacritics that break Supabase storage keys', () => {
    assert.equal(
      sanitizeDocumentFileName('Borrèl-AD-rapportage-24-juli-26.pdf'),
      'Borrel-AD-rapportage-24-juli-26.pdf'
    );
  });

  it('replaces spaces with dashes', () => {
    assert.equal(sanitizeDocumentFileName('my report.pdf'), 'my-report.pdf');
  });

  it('rejects path traversal and separators', () => {
    assert.equal(sanitizeDocumentFileName('../secret.pdf'), null);
    assert.equal(sanitizeDocumentFileName('a/b.pdf'), null);
    assert.equal(sanitizeDocumentFileName('a\\b.pdf'), null);
  });

  it('falls back when the base name has no safe characters', () => {
    assert.equal(sanitizeDocumentFileName('📄.pdf'), 'file.pdf');
  });
});

describe('buildDocumentStoragePath', () => {
  it('prefixes employee id and type', () => {
    assert.equal(
      buildDocumentStoragePath(
        'b803b699-5876-4151-9a16-aa07e938128a',
        'ad_rapportage',
        'Borrel-AD-rapportage-24-juli-26.pdf'
      ),
      'b803b699-5876-4151-9a16-aa07e938128a/ad_rapportage-Borrel-AD-rapportage-24-juli-26.pdf'
    );
  });
});
