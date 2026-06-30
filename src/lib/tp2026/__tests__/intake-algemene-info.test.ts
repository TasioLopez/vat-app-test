import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEducationLevel,
  repairEmployeeEducationFields,
} from '@/lib/tp2026/gegevens-field-options';
import {
  isEducationCertification,
  resolveIntakeEducationFields,
  resolveWorkExperienceFromIntake,
} from '@/lib/tp2026/intake-algemene-info';

const SAMPLE_ALGEMENE_INFO = `
Algemene informatie:
Opleidingen? Afgerond?
LHNO Ja
VCA (2025) Ja

Werkervaring? Van-tot?
Gom Schoonhouden 2019-heden
Teamleider PostNL/PTT 25,5 jaar
Thuiszorg
Keukenassistent
Winkelmedewerker

Rijbewijzen
B Personenauto
`;

describe('isEducationCertification', () => {
  it('detects VCA variants', () => {
    assert.equal(isEducationCertification('VCA'), true);
    assert.equal(isEducationCertification('VCA (2025)'), true);
    assert.equal(isEducationCertification('VVCA'), true);
  });

  it('does not flag schooling levels', () => {
    assert.equal(isEducationCertification('LHNO'), false);
    assert.equal(isEducationCertification('VMBO'), false);
  });
});

describe('normalizeEducationLevel LHNO', () => {
  it('maps lhno to LHNO', () => {
    assert.equal(normalizeEducationLevel('lhno'), 'LHNO');
    assert.equal(normalizeEducationLevel('LHNO'), 'LHNO');
  });
});

describe('repairEmployeeEducationFields', () => {
  it('clears VCA from education_name when level is LHNO', () => {
    const result = repairEmployeeEducationFields('LHNO', 'VCA');
    assert.equal(result.education_level, 'LHNO');
    assert.equal(result.education_name, undefined);
  });
});

describe('resolveIntakeEducationFields', () => {
  it('resolves LHNO and drops VCA from specialization', () => {
    const result = resolveIntakeEducationFields(
      { education_level: undefined, education_name: 'VCA (2025)' },
      SAMPLE_ALGEMENE_INFO
    );
    assert.equal(result.education_level, 'LHNO');
    assert.equal(result.education_name, undefined);
  });

  it('trusts valid LLM LHNO level', () => {
    const result = resolveIntakeEducationFields(
      { education_level: 'LHNO', education_name: 'VCA' },
      SAMPLE_ALGEMENE_INFO
    );
    assert.equal(result.education_level, 'LHNO');
    assert.equal(result.education_name, undefined);
  });
});

describe('resolveWorkExperienceFromIntake', () => {
  it('extracts multiple job titles and skips employer-only row', () => {
    const result = resolveWorkExperienceFromIntake(
      'medewerker algemeen schoonmaakonderhoud',
      SAMPLE_ALGEMENE_INFO
    );
    assert.ok(result);
    assert.match(result!, /Teamleider PostNL\/PTT/i);
    assert.match(result!, /Thuiszorg/i);
    assert.match(result!, /Keukenassistent/i);
    assert.match(result!, /Winkelmedewerker/i);
    assert.doesNotMatch(result!, /Gom Schoonhouden/i);
  });

  it('trusts LLM when two or more comma-separated titles provided', () => {
    const llm =
      'Teamleider PostNL/PTT, Thuiszorg, Keukenassistent, Winkelmedewerker';
    const result = resolveWorkExperienceFromIntake(llm, SAMPLE_ALGEMENE_INFO);
    assert.equal(result, llm);
  });
});
