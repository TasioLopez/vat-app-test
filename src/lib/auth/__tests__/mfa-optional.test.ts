import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isMfaOptionalEmail,
  mfaChallengeLoginPath,
  parseMfaOptionalEmails,
} from '../mfa';

describe('parseMfaOptionalEmails', () => {
  it('returns empty set when env is unset', () => {
    assert.equal(parseMfaOptionalEmails({}).size, 0);
  });

  it('parses MFA_OPTIONAL_EMAILS and NEXT_PUBLIC_MFA_OPTIONAL_EMAILS', () => {
    const emails = parseMfaOptionalEmails({
      MFA_OPTIONAL_EMAILS: 'a@example.com, B@Example.com',
      NEXT_PUBLIC_MFA_OPTIONAL_EMAILS: ' c@example.com ',
    });
    assert.deepEqual([...emails].sort(), ['a@example.com', 'b@example.com', 'c@example.com']);
  });
});

describe('isMfaOptionalEmail', () => {
  it('returns false for empty env or empty email', () => {
    assert.equal(isMfaOptionalEmail('someone@example.com', {}), false);
    assert.equal(
      isMfaOptionalEmail('', { MFA_OPTIONAL_EMAILS: 'bot@example.com' }),
      false
    );
    assert.equal(
      isMfaOptionalEmail(null, { MFA_OPTIONAL_EMAILS: 'bot@example.com' }),
      false
    );
  });

  it('matches case-insensitively with surrounding whitespace', () => {
    const env = { MFA_OPTIONAL_EMAILS: 'testbot@vatstaging.com' };
    assert.equal(isMfaOptionalEmail('  TestBot@VatStaging.com  ', env), true);
    assert.equal(isMfaOptionalEmail('other@vatstaging.com', env), false);
  });
});

describe('mfaChallengeLoginPath', () => {
  it('routes to MFA resume without implying full session expiry', () => {
    assert.equal(mfaChallengeLoginPath(), '/login?reason=mfa_required');
    assert.equal(
      mfaChallengeLoginPath('/dashboard'),
      '/login?reason=mfa_required&redirect=%2Fdashboard'
    );
  });

  it('rejects open redirects in redirectPath', () => {
    assert.equal(mfaChallengeLoginPath('https://evil.example'), '/login?reason=mfa_required');
    assert.equal(mfaChallengeLoginPath('//evil.example'), '/login?reason=mfa_required');
  });
});
