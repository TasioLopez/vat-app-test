import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildChatlikeEmployeeDetailsFromRaw,
  buildIntakeTextExcerptForChatlike,
  parseChatlikeEmployeeOutput,
} from '../extractEmployeeDetailsChatlike';

describe('buildChatlikeEmployeeDetailsFromRaw', () => {
  it('keeps transport/dutch/computer from freeform parse (no clear-on-null)', () => {
    const parsed = parseChatlikeEmployeeOutput(
      JSON.stringify({
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
      })
    );

    const { detailsRaw, referentFields } = buildChatlikeEmployeeDetailsFromRaw(parsed);

    assert.deepEqual(detailsRaw.transport_type, ['Auto']);
    assert.deepEqual(detailsRaw.drivers_license_type, ['B']);
    assert.equal(detailsRaw.dutch_speaking, 'Goed');
    assert.equal(detailsRaw.computer_skills, '4');
    assert.equal(detailsRaw.has_computer, true);
    assert.equal(detailsRaw.work_experience, 'Transportplanner');
    assert.equal(referentFields.referent_first_name, 'Marty');
    assert.equal(referentFields.referent_last_name, 'Melman');
  });

  it('parses fenced JSON like ChatGPT sometimes returns', () => {
    const parsed = parseChatlikeEmployeeOutput(`\`\`\`json
{"transport_type":["Auto"],"dutch_speaking":"Goed","computer_skills":"4"}
\`\`\``);
    assert.deepEqual(parsed.transport_type, ['Auto']);
    assert.equal(parsed.dutch_speaking, 'Goed');
    assert.equal(parsed.computer_skills, '4');
  });
});

describe('buildIntakeTextExcerptForChatlike', () => {
  it('prefers the Hoe-verplaatst / checkbox region', () => {
    const full = `${'x'.repeat(2000)}\nHoe verplaatst werknemer zich:\n☒ Auto ☐ Fiets ☐ OV ☐ Lopend\nNederlands ☒ ☐ ☐\n${'y'.repeat(500)}`;
    const excerpt = buildIntakeTextExcerptForChatlike(full, 1500);
    assert.match(excerpt, /Hoe verplaatst/);
    assert.match(excerpt, /☒ Auto/);
    assert.ok(excerpt.length <= 1500);
  });
});
