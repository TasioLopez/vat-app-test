import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bronStepLabelForPurpose,
  documentTypeForPurpose,
  normalizeMeetingPurpose,
  publishLabelForPurpose,
} from '@/lib/meetings/audio';

describe('documentTypeForPurpose', () => {
  it('maps intake and vgr to published document types', () => {
    assert.equal(documentTypeForPurpose('intake'), 'gespreksverslag');
    assert.equal(documentTypeForPurpose('vgr'), 'gespreksverslag_vgr');
    assert.equal(documentTypeForPurpose('overig'), null);
  });
});

describe('publishLabelForPurpose', () => {
  it('returns CTA labels only for publishable purposes', () => {
    assert.equal(publishLabelForPurpose('intake'), 'Gebruik als bron voor intake');
    assert.equal(publishLabelForPurpose('vgr'), 'Gebruik als bron voor VGR');
    assert.equal(publishLabelForPurpose('overig'), null);
  });
});

describe('bronStepLabelForPurpose', () => {
  it('labels progress step 3 by purpose', () => {
    assert.equal(bronStepLabelForPurpose('intake'), 'Bron intake');
    assert.equal(bronStepLabelForPurpose('vgr'), 'Bron VGR');
    assert.equal(bronStepLabelForPurpose('overig'), 'Bron');
  });
});

describe('normalizeMeetingPurpose', () => {
  it('defaults unknown values to intake', () => {
    assert.equal(normalizeMeetingPurpose('vgr'), 'vgr');
    assert.equal(normalizeMeetingPurpose(null), 'intake');
    assert.equal(normalizeMeetingPurpose('nope'), 'intake');
  });
});
