import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rewritePayloadPhotosForChild } from '../clone-share-child';
import type { CvDocumentPayload } from '@/types/cv';
import { emptyCvModel } from '@/types/cv';

describe('rewritePayloadPhotosForChild', () => {
  it('rewrites photo paths from parent cv id to child cv id', () => {
    const employeeId = 'emp-1';
    const parentId = 'parent-cv';
    const childId = 'child-cv';
    const payload: CvDocumentPayload = {
      schemaVersion: 2,
      activeLocale: 'nl',
      content: {
        nl: {
          ...emptyCvModel(),
          personal: {
            ...emptyCvModel().personal,
            photoStoragePath: `${employeeId}/${parentId}/photo.jpg`,
          },
        },
        en: {
          ...emptyCvModel(),
          personal: {
            ...emptyCvModel().personal,
            photoStoragePath: `${employeeId}/${parentId}/photo.jpg`,
          },
        },
      },
      layout: [],
    };

    const next = rewritePayloadPhotosForChild(payload, employeeId, parentId, childId);
    assert.equal(next.content.nl.personal.photoStoragePath, `${employeeId}/${childId}/photo.jpg`);
    assert.equal(next.content.en?.personal.photoStoragePath, `${employeeId}/${childId}/photo.jpg`);
  });
});
