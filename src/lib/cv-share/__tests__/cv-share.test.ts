import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateShareToken, hashShareToken } from '../tokens';
import { normalizeEmail } from '../normalize-email';
import {
  createShareSessionToken,
  parseShareSessionToken,
} from '../session';
import { checkVerifyRateLimit, resetVerifyRateLimit } from '../rate-limit';

describe('cv-share tokens', () => {
  test('generateShareToken produces unique tokens', () => {
    const a = generateShareToken();
    const b = generateShareToken();
    assert.notEqual(a, b);
    assert.ok(a.length > 20);
  });

  test('hashShareToken is deterministic', () => {
    const raw = 'test-token-abc';
    assert.equal(hashShareToken(raw), hashShareToken(raw));
    assert.notEqual(hashShareToken(raw), hashShareToken('other'));
  });
});

describe('normalizeEmail', () => {
  test('trims and lowercases', () => {
    assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
  });
});

describe('cv-share session', () => {
  test('create and parse session token', () => {
    const prev = process.env.CV_SHARE_SESSION_SECRET;
    process.env.CV_SHARE_SESSION_SECRET = 'test-secret-min-16-chars!!';
    try {
      const expires = new Date(Date.now() + 60_000);
      const token = createShareSessionToken(
        {
          shareId: 'share-1',
          cvId: 'cv-1',
          employeeId: 'emp-1',
          email: 'user@test.nl',
        },
        expires
      );
      const parsed = parseShareSessionToken(token);
      assert.ok(parsed);
      assert.equal(parsed!.shareId, 'share-1');
      assert.equal(parsed!.email, 'user@test.nl');
    } finally {
      if (prev === undefined) delete process.env.CV_SHARE_SESSION_SECRET;
      else process.env.CV_SHARE_SESSION_SECRET = prev;
    }
  });

  test('rejects expired session', () => {
    const prev = process.env.CV_SHARE_SESSION_SECRET;
    process.env.CV_SHARE_SESSION_SECRET = 'test-secret-min-16-chars!!';
    try {
      const expires = new Date(Date.now() - 1000);
      const token = createShareSessionToken(
        {
          shareId: 'share-1',
          cvId: 'cv-1',
          employeeId: 'emp-1',
          email: 'user@test.nl',
        },
        expires
      );
      assert.equal(parseShareSessionToken(token), null);
    } finally {
      if (prev === undefined) delete process.env.CV_SHARE_SESSION_SECRET;
      else process.env.CV_SHARE_SESSION_SECRET = prev;
    }
  });
});

describe('verify rate limit', () => {
  test('allows attempts under limit', async () => {
    const ip = `test-ip-${Date.now()}`;
    await resetVerifyRateLimit(ip);
    for (let i = 0; i < 5; i++) {
      assert.equal((await checkVerifyRateLimit(ip)).ok, true);
    }
    assert.equal((await checkVerifyRateLimit(ip)).ok, false);
    await resetVerifyRateLimit(ip);
  });
});
