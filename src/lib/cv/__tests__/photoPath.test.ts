import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCvPhotoStoragePath,
  sanitizeCvPayloadPhotoPaths,
} from '@/lib/cv/photoPath';
import type { CvDocumentPayload, CvModel } from '@/types/cv';

const employeeId = '11111111-1111-1111-1111-111111111111';
const cvId = '22222222-2222-2222-2222-222222222222';
const otherEmployee = '33333333-3333-3333-3333-333333333333';

function emptyModel(photoStoragePath?: string): CvModel {
  return {
    personal: {
      fullName: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      ...(photoStoragePath ? { photoStoragePath } : {}),
    },
    profile: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    interests: [],
    extra: '',
    options: { includePhotoInCv: Boolean(photoStoragePath) },
  };
}

function payloadWithPaths(nlPath?: string, enPath?: string): CvDocumentPayload {
  return {
    schemaVersion: 2,
    activeLocale: 'nl',
    content: {
      nl: emptyModel(nlPath),
      ...(enPath ? { en: emptyModel(enPath) } : {}),
    },
    layout: [],
  };
}

describe('isValidCvPhotoStoragePath', () => {
  it('accepts employee/cv/filename', () => {
    assert.equal(
      isValidCvPhotoStoragePath(employeeId, cvId, `${employeeId}/${cvId}/photo.jpg`),
      true
    );
  });

  it('rejects wrong employee', () => {
    assert.equal(
      isValidCvPhotoStoragePath(employeeId, cvId, `${otherEmployee}/${cvId}/photo.jpg`),
      false
    );
  });

  it('rejects wrong cv id', () => {
    assert.equal(
      isValidCvPhotoStoragePath(
        employeeId,
        cvId,
        `${employeeId}/99999999-9999-9999-9999-999999999999/photo.jpg`
      ),
      false
    );
  });

  it('rejects path traversal and nested paths', () => {
    assert.equal(
      isValidCvPhotoStoragePath(employeeId, cvId, `${employeeId}/${cvId}/../x.jpg`),
      false
    );
    assert.equal(
      isValidCvPhotoStoragePath(employeeId, cvId, `${employeeId}/${cvId}/a/b.jpg`),
      false
    );
    assert.equal(isValidCvPhotoStoragePath(employeeId, cvId, ''), false);
  });
});

describe('sanitizeCvPayloadPhotoPaths', () => {
  it('keeps valid paths and clears poisoned NL/EN paths', () => {
    const valid = `${employeeId}/${cvId}/ok.jpg`;
    const poisoned = `${otherEmployee}/${cvId}/evil.jpg`;
    const sanitized = sanitizeCvPayloadPhotoPaths(
      payloadWithPaths(poisoned, valid),
      employeeId,
      cvId
    );
    assert.equal(sanitized.content.nl.personal.photoStoragePath, undefined);
    assert.equal(sanitized.content.en?.personal.photoStoragePath, valid);
  });
});
