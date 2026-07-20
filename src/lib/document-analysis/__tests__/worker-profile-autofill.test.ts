import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasMeaningfulIntakeMappedPayload,
  shouldSkipSecondaryDocsForWorkerProfile,
} from '../worker-profile-autofill';

describe('shouldSkipSecondaryDocsForWorkerProfile', () => {
  it('skips when intake processed with mapped fields', () => {
    assert.equal(
      shouldSkipSecondaryDocsForWorkerProfile(true, { transport_type: ['Auto'] }),
      true
    );
  });

  it('does not skip without intake', () => {
    assert.equal(
      shouldSkipSecondaryDocsForWorkerProfile(false, { transport_type: ['Auto'] }),
      false
    );
  });

  it('does not skip when intake mapped payload is empty', () => {
    assert.equal(shouldSkipSecondaryDocsForWorkerProfile(true, {}), false);
    assert.equal(hasMeaningfulIntakeMappedPayload({}), false);
  });
});
