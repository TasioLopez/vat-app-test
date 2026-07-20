import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildChatlikeEmployeeDetailsFromRaw } from '../extractEmployeeDetailsChatlike';
import { parseEmployeeExtractionResult } from '../schemas/employee-extraction-schema';

describe('buildChatlikeEmployeeDetailsFromRaw', () => {
  it('keeps transport/dutch/computer from soft schema parse (no clear-on-null)', () => {
    const parsed = parseEmployeeExtractionResult({
      current_job: 'Logistiek Coördinator',
      transport_type: ['Auto'],
      drivers_license_type: ['B'],
      drivers_license: true,
      dutch_speaking: 'Goed',
      dutch_writing: 'Goed',
      dutch_reading: 'Goed',
      has_computer: true,
      computer_skills: '4',
      referent_first_name: 'Marty',
      referent_last_name: 'Melman',
      work_experience: 'Logistiek Coördinator, Transportplanner',
    });

    const { detailsRaw, referentFields } = buildChatlikeEmployeeDetailsFromRaw(parsed);

    assert.deepEqual(detailsRaw.transport_type, ['Auto']);
    assert.deepEqual(detailsRaw.drivers_license_type, ['B']);
    assert.equal(detailsRaw.dutch_speaking, 'Goed');
    assert.equal(detailsRaw.computer_skills, '4');
    assert.equal(detailsRaw.has_computer, true);
    // current_job stripped from work_experience
    assert.equal(detailsRaw.work_experience, 'Transportplanner');
    assert.equal(referentFields.referent_first_name, 'Marty');
    assert.equal(referentFields.referent_last_name, 'Melman');
  });

  it('does not invent or wipe fields when transport is present', () => {
    const { detailsRaw } = buildChatlikeEmployeeDetailsFromRaw({
      transport_type: ['Auto', 'Fiets'],
      dutch_speaking: 'Gemiddeld',
    });
    assert.deepEqual(detailsRaw.transport_type, ['Auto', 'Fiets']);
    assert.equal(detailsRaw.dutch_speaking, 'Gemiddeld');
    assert.equal('drivers_license_type' in detailsRaw, false);
  });
});
