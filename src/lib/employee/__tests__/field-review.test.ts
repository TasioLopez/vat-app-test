import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEmployeeAutofillReviewMarks,
  computeEmployeeFieldHash,
  getEmployeeFieldDisplayStatus,
  type EmployeeDetailFieldKey,
} from '../field-review';

describe('employee field review helpers', () => {
  const details = {
    phone: '06 12345678',
    transport_type: ['Auto', 'OV'],
    work_experience: '["X","Y"]',
  } satisfies Partial<Record<EmployeeDetailFieldKey, unknown>>;

  it('returns empty when there is no review metadata', () => {
    assert.equal(
      getEmployeeFieldDisplayStatus('phone', details, {}, {}),
      'empty'
    );
  });

  it('returns review when marked as review', () => {
    assert.equal(
      getEmployeeFieldDisplayStatus('phone', details, { phone: 'review' }, {}),
      'review'
    );
  });

  it('returns validated when marked validated and hash matches', () => {
    const hash = computeEmployeeFieldHash('phone', details);
    assert.equal(
      getEmployeeFieldDisplayStatus('phone', details, { phone: 'validated' }, { phone: hash }),
      'validated'
    );
  });

  it('downgrades validated to review when hash mismatches', () => {
    assert.equal(
      getEmployeeFieldDisplayStatus(
        'phone',
        details,
        { phone: 'validated' },
        { phone: 'wrong' }
      ),
      'review'
    );
  });

  it('applyEmployeeAutofillReviewMarks sets review and clears hashes', () => {
    const { nextReviewStatusMap, nextContentHashMap } = applyEmployeeAutofillReviewMarks(
      ['phone', 'transport_type'] as EmployeeDetailFieldKey[],
      { phone: 'validated', transport_type: 'validated' },
      { phone: 'hash1', transport_type: 'hash2' }
    );

    assert.equal(nextReviewStatusMap.phone, 'review');
    assert.equal(nextReviewStatusMap.transport_type, 'review');
    assert.equal(nextContentHashMap.phone, undefined);
    assert.equal(nextContentHashMap.transport_type, undefined);
  });

  it('hash normalization uses parseWorkExperience for work_experience', () => {
    const a = computeEmployeeFieldHash('work_experience', {
      work_experience: '["A","B"]',
    });
    const b = computeEmployeeFieldHash('work_experience', {
      work_experience: 'A, B',
    });
    assert.equal(a, b);
  });
});

