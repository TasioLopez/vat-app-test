import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDocumentStoragePath,
  DOCUMENT_MAX_BYTES,
  resolveDocumentMime,
  sanitizeDocumentFileName,
} from '../upload-validation';
import { prepareEmployeeDocumentSignedUpload } from '../prepare-signed-upload';

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

  it('sanitizes long Lambers-style AD report names', () => {
    const name =
      'Arbeidsdeskundig onderzoek - Dhr. R.P.J.W. Lambers - Wesotronic - Conceptrapport - kopie.pdf';
    const safe = sanitizeDocumentFileName(name);
    assert.ok(safe);
    assert.match(safe!, /\.pdf$/);
    assert.ok(!safe!.includes(' '));
    assert.ok(!safe!.includes('/'));
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

describe('resolveDocumentMime', () => {
  it('accepts explicit allowed MIME types', () => {
    assert.equal(resolveDocumentMime('application/pdf', 'x.bin'), 'application/pdf');
    assert.equal(resolveDocumentMime('image/png', 'x.bin'), 'image/png');
    assert.equal(resolveDocumentMime('image/jpeg', 'x.bin'), 'image/jpeg');
  });

  it('infers MIME from extension when Content-Type is missing', () => {
    assert.equal(resolveDocumentMime('', 'rapport.pdf'), 'application/pdf');
    assert.equal(resolveDocumentMime('application/octet-stream', 'photo.jpg'), 'image/jpeg');
  });

  it('rejects unknown types', () => {
    assert.equal(resolveDocumentMime('application/zip', 'a.zip'), null);
    assert.equal(resolveDocumentMime('', 'a.exe'), null);
  });
});

describe('prepareEmployeeDocumentSignedUpload', () => {
  const employeeId = 'b803b699-5876-4151-9a16-aa07e938128a';

  it('builds a valid AD path for a long filename near the size limit', () => {
    const result = prepareEmployeeDocumentSignedUpload({
      employeeId,
      type: 'ad_rapportage',
      originalName:
        'Arbeidsdeskundig onderzoek - Dhr. R.P.J.W. Lambers - Wesotronic - Conceptrapport - kopie.pdf',
      contentType: 'application/pdf',
      sizeBytes: 4_655_950,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.path, new RegExp(`^${employeeId}/ad_rapportage-`));
    assert.match(result.path, /\.pdf$/);
    assert.equal(result.contentType, 'application/pdf');
  });

  it('rejects files over DOCUMENT_MAX_BYTES', () => {
    const result = prepareEmployeeDocumentSignedUpload({
      employeeId,
      type: 'ad_rapportage',
      originalName: 'big.pdf',
      contentType: 'application/pdf',
      sizeBytes: DOCUMENT_MAX_BYTES + 1,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /too large/i);
    assert.equal(result.status, 400);
  });

  it('rejects unsupported MIME / extension', () => {
    const result = prepareEmployeeDocumentSignedUpload({
      employeeId,
      type: 'ad_rapportage',
      originalName: 'virus.exe',
      contentType: 'application/x-msdownload',
      sizeBytes: 100,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Unsupported/i);
  });

  it('rejects invalid file names', () => {
    const result = prepareEmployeeDocumentSignedUpload({
      employeeId,
      type: 'ad_rapportage',
      originalName: '../secret.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Invalid file name/i);
  });
});
