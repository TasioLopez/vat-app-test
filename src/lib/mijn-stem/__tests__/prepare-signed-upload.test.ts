import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isOwnedMijnStemStoragePath,
  MIJN_STEM_MAX_BYTES,
  prepareMijnStemSignedUpload,
} from '../prepare-signed-upload';

describe('prepareMijnStemSignedUpload', () => {
  const userId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

  it('builds path under userId/mijn-stem-', () => {
    const result = prepareMijnStemSignedUpload({
      userId,
      originalName: 'mijn stijl.pdf',
      contentType: 'application/pdf',
      sizeBytes: 5_000_000,
      timestamp: 1700000000000,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.path, `${userId}/mijn-stem-1700000000000-mijn-stijl.pdf`);
    assert.equal(result.contentType, 'application/pdf');
  });

  it('rejects oversized files', () => {
    const result = prepareMijnStemSignedUpload({
      userId,
      originalName: 'big.pdf',
      contentType: 'application/pdf',
      sizeBytes: MIJN_STEM_MAX_BYTES + 1,
    });
    assert.equal(result.ok, false);
  });

  it('rejects unsupported types', () => {
    const result = prepareMijnStemSignedUpload({
      userId,
      originalName: 'x.png',
      contentType: 'image/png',
      sizeBytes: 100,
    });
    assert.equal(result.ok, false);
  });
});

describe('isOwnedMijnStemStoragePath', () => {
  const userId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

  it('accepts owned paths', () => {
    assert.equal(
      isOwnedMijnStemStoragePath(userId, `${userId}/mijn-stem-1-file.pdf`),
      true
    );
  });

  it('rejects other users and traversal', () => {
    assert.equal(
      isOwnedMijnStemStoragePath(userId, `other-user/mijn-stem-1-file.pdf`),
      false
    );
    assert.equal(
      isOwnedMijnStemStoragePath(userId, `${userId}/mijn-stem-../evil.pdf`),
      false
    );
  });
});
