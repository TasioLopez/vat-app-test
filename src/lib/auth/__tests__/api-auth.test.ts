import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUuid,
  parseEmployeeIdFromDocumentPath,
} from '@/lib/auth/api-auth';

describe('isUuid', () => {
  it('accepts valid UUIDs', () => {
    assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true);
  });

  it('rejects invalid values', () => {
    assert.equal(isUuid('not-a-uuid'), false);
    assert.equal(isUuid(''), false);
  });
});

describe('parseEmployeeIdFromDocumentPath', () => {
  const employeeId = '550e8400-e29b-41d4-a716-446655440000';

  it('parses employee prefix from relative path', () => {
    assert.equal(
      parseEmployeeIdFromDocumentPath(`${employeeId}/intake-report.pdf`),
      employeeId
    );
  });

  it('parses employee prefix from documents/ path', () => {
    assert.equal(
      parseEmployeeIdFromDocumentPath(`documents/${employeeId}/intake-report.pdf`),
      employeeId
    );
  });

  it('returns null when prefix is not a UUID', () => {
    assert.equal(parseEmployeeIdFromDocumentPath('foo/bar.pdf'), null);
  });
});
