import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEducationLevel,
  repairEmployeeEducationFields,
} from '@/lib/tp2026/gegevens-field-options';
import {
  isEducationCertification,
  isPlausibleWorkExperience,
  resolveIntakeEducationFields,
  resolveWorkExperienceFromIntake,
  sanitizeWorkExperienceString,
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

const BEP_VAN_BURK_ALGEMENE_INFO = `
Algemene informatie:
Opleidingen? Afgerond?
Huishoudschool Ja

Werkervaring? Van-tot?
Bakkerij Bouman 2000-heden
Zorgmedewerker gehandicaptenzorg (ADL taken en ze ergens brengen) Ongeveer 5 jaar gedaan

Rijbewijzen
`;

const MELISSA_V7_ALGEMENE_INFO = `
Algemene informatie:
Opleidingen? Afgerond?
Mbo lucht vaar dienstverlenig  ☒ ☐  Axxicom  13+ jaar
Hbo Toerisme en reacreatie  ☒ ☐  Voor studie half jaar in buitenland 2 x.

Werkervaring? Van-tot?
Axxicom  13+ jaar

Sectie 13 Werkverleden
Heeft ook wel andere functies gedaan passagiers assistent, operationele planner.
`;

describe('isEducationCertification', () => {
  it('detects VCA variants', () => {
    assert.equal(isEducationCertification('VCA'), true);
    assert.equal(isEducationCertification('VCA (2025)'), true);
    assert.equal(isEducationCertification('VVCA'), true);
  });

  it('detects BHV and Lean Six Sigma style certificates', () => {
    assert.equal(isEducationCertification('BHV'), true);
    assert.equal(isEducationCertification('Lean Six Sigma Green Belt (basis)'), true);
  });

  it('does not flag schooling levels', () => {
    assert.equal(isEducationCertification('LHNO'), false);
    assert.equal(isEducationCertification('VMBO'), false);
    assert.equal(isEducationCertification('Manager Transport & Logistiek'), false);
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

  it('uses document table over inconsistent LLM output', () => {
    const result = resolveIntakeEducationFields(
      { education_level: 'VMBO', education_name: 'VCA' },
      SAMPLE_ALGEMENE_INFO
    );
    assert.equal(result.education_level, 'LHNO');
    assert.equal(result.education_name, undefined);
  });

  it('picks highest finished study when multiple are completed', () => {
    const text = `Algemene informatie:
Opleidingen? Afgerond?
VMBO Ja
MBO 4 Ja`;
    const result = resolveIntakeEducationFields({ education_level: 'VMBO' }, text);
    assert.equal(result.education_level, 'MBO 4');
  });

  it('returns empty when only unfinished studies exist', () => {
    const text = `Algemene informatie:
Opleidingen? Afgerond?
MBO 2 Nee`;
    const result = resolveIntakeEducationFields({ education_level: 'MBO 2' }, text);
    assert.deepEqual(result, {});
  });

  it('resolves Melissa V7 checkbox education rows to HBO with specialization', () => {
    const result = resolveIntakeEducationFields(
      { education_level: undefined, education_name: undefined },
      MELISSA_V7_ALGEMENE_INFO
    );
    assert.equal(result.education_level, 'HBO');
    assert.match(result.education_name ?? '', /Toerisme/i);
  });
});

describe('isPlausibleWorkExperience', () => {
  it('rejects citation markers and field labels', () => {
    assert.equal(
      isPlausibleWorkExperience('- **current_job**: "Operator productie II"【4:0†source】。'),
      false
    );
    assert.equal(isPlausibleWorkExperience('Teamleider PostNL/PTT, Thuiszorg'), true);
  });
});

describe('sanitizeWorkExperienceString', () => {
  it('strips markdown current_job label', () => {
    assert.equal(
      sanitizeWorkExperienceString('- **current_job**: Operator productie II'),
      'Operator productie II'
    );
  });

  it('drops title that duplicates current_job', () => {
    assert.equal(
      sanitizeWorkExperienceString('Operator productie II', 'Operator productie II - ambachtelijke bakkerij'),
      ''
    );
  });

  it('strips citations and quotes before overlap check', () => {
    assert.equal(
      sanitizeWorkExperienceString(
        '"Operator productie II"【4:0†source】',
        'Operator productie II - ambachtelijke bakkerij'
      ),
      ''
    );
  });
});

describe('resolveWorkExperienceFromIntake', () => {
  it('clears markdown current_job echo when table is empty', () => {
    const result = resolveWorkExperienceFromIntake(
      '- **current_job**: Operator productie II',
      'Algemene informatie:\nWerkervaring? Van-tot?\n',
      { currentJob: 'Operator productie II - ambachtelijke bakkerij' }
    );
    assert.equal(result, undefined);
  });

  it('rejects LLM citation garbage even when table is empty', () => {
    const result = resolveWorkExperienceFromIntake(
      '- **current_job**: "Operator productie II"【4:0†source】.',
      '',
      { currentJob: 'Operator productie II - ambachtelijke bakkerij' }
    );
    assert.equal(result, undefined);
  });

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

  it('prefers document table over inconsistent LLM output', () => {
    const result = resolveWorkExperienceFromIntake(
      'Bakkerij Bouman',
      BEP_VAN_BURK_ALGEMENE_INFO,
      { currentJob: 'Operator productie II - ambachtelijke bakkerij' }
    );
    assert.ok(result);
    assert.match(result!, /Zorgmedewerker gehandicaptenzorg/i);
    assert.doesNotMatch(result!, /Bakkerij Bouman/i);
    assert.doesNotMatch(result!, /Operator productie II/i);
  });

  it('returns stable table result regardless of LLM garbage', () => {
    const good = resolveWorkExperienceFromIntake(
      'Bakkerij Bouman',
      BEP_VAN_BURK_ALGEMENE_INFO,
      { currentJob: 'Operator productie II - ambachtelijke bakkerij' }
    );
    const garbage = resolveWorkExperienceFromIntake(
      '- **current_job**: "Operator productie II"【4:0†source】.',
      BEP_VAN_BURK_ALGEMENE_INFO,
      { currentJob: 'Operator productie II - ambachtelijke bakkerij' }
    );
    assert.equal(good, garbage);
    assert.match(good!, /Zorgmedewerker gehandicaptenzorg/i);
  });

  it('uses plausible LLM value only when table has no job titles', () => {
    const llm = 'Teamleider PostNL/PTT, Thuiszorg, Keukenassistent, Winkelmedewerker';
    const result = resolveWorkExperienceFromIntake(llm, 'Algemene informatie:\nWerkervaring? Van-tot?\n');
    assert.equal(result, llm);
  });

  it('falls back to sectie 13 when table has only employer/duration', () => {
    const result = resolveWorkExperienceFromIntake(
      undefined,
      MELISSA_V7_ALGEMENE_INFO,
      { currentJob: 'Supervisor' }
    );
    assert.ok(result);
    assert.match(result!, /passagiers assistent/i);
    assert.match(result!, /operationele planner/i);
    assert.doesNotMatch(result!, /Supervisor/i);
    assert.doesNotMatch(result!, /Axxicom/i);
  });
});
