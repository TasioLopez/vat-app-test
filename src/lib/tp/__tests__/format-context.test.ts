import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArtsPhrase,
  buildSupervisiePhrase,
  enrichArtsOrgFromMeta,
  expandDoctorRoleAbbreviations,
  formatDoctorWithRole,
  resolveOccupationalDoctorLabel,
  stripLeadingDoctorRolePrefix,
} from '../format-context';

describe('expandDoctorRoleAbbreviations', () => {
  it('expands VA and BA at word boundaries', () => {
    assert.equal(
      expandDoctorRoleAbbreviations('VA P. Mort werkend onder supervisie van BA K. Julien'),
      'Verzekeringsarts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien'
    );
  });

  it('does not alter full titles', () => {
    assert.equal(
      expandDoctorRoleAbbreviations('Verzekeringsarts A.J. Karim'),
      'Verzekeringsarts A.J. Karim'
    );
    assert.equal(
      expandDoctorRoleAbbreviations('Bedrijfsarts M. Montagne'),
      'Bedrijfsarts M. Montagne'
    );
  });
});

describe('buildArtsPhrase', () => {
  it('preserves Verzekeringsarts prefix', () => {
    assert.equal(buildArtsPhrase('Verzekeringsarts Ankersmit'), 'Verzekeringsarts Ankersmit');
  });

  it('preserves Bedrijfsarts prefix', () => {
    assert.equal(buildArtsPhrase('Bedrijfsarts X'), 'Bedrijfsarts X');
  });

  it('preserves verbatim supervisie sentence', () => {
    const input = 'Arts L. Bollen werkend onder supervisie van arts T. de Haas';
    assert.equal(buildArtsPhrase(input), input);
  });

  it('expands BA/VA abbreviations in supervisie sentence', () => {
    assert.equal(
      buildArtsPhrase('VA P. Mort werkend onder supervisie van BA K. Julien'),
      'Verzekeringsarts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien'
    );
  });

  it('rebuilds comma-supervisie with role prefixes', () => {
    assert.equal(
      buildArtsPhrase('Arts L. Bollen, werkend onder supervisie van: T. de Haas'),
      'Arts L. Bollen werkend onder supervisie van Arts T. de Haas'
    );
  });

  it('uses Arts fallback for name-only input', () => {
    assert.equal(buildArtsPhrase('Ankersmit'), 'Arts Ankersmit');
  });

  it('returns placeholder when empty', () => {
    assert.equal(
      buildArtsPhrase(''),
      'Arts [naam] werkend onder supervisie van Arts [supervisor]'
    );
  });
});

describe('formatDoctorWithRole', () => {
  it('does not double-prefix when name already has VA abbreviation', () => {
    assert.equal(
      formatDoctorWithRole('VA P. Mort', 'VA'),
      'Verzekeringsarts P. Mort'
    );
  });

  it('does not double-prefix when name already has BA abbreviation', () => {
    assert.equal(
      formatDoctorWithRole('BA K. Julien', 'BA'),
      'Bedrijfsarts K. Julien'
    );
  });

  it('prefixes Aios without confusing with Anios', () => {
    assert.equal(formatDoctorWithRole('J. de Vries', 'Aios'), 'Aios J. de Vries');
    assert.equal(formatDoctorWithRole('J. de Vries', 'Anios'), 'Anios J. de Vries');
  });
});

describe('resolveOccupationalDoctorLabel', () => {
  it('defaults to Bedrijfsarts when empty or name-only', () => {
    assert.equal(resolveOccupationalDoctorLabel(null), 'Bedrijfsarts');
    assert.equal(resolveOccupationalDoctorLabel(''), 'Bedrijfsarts');
    assert.equal(resolveOccupationalDoctorLabel('S.V. Ramlochan-Tewari'), 'Bedrijfsarts');
  });

  it('uses leading title as label', () => {
    assert.equal(
      resolveOccupationalDoctorLabel('Verzekeringsarts A.J. Karim'),
      'Verzekeringsarts'
    );
    assert.equal(resolveOccupationalDoctorLabel('Aios J. de Vries'), 'Aios');
    assert.equal(resolveOccupationalDoctorLabel('Anios J. de Vries'), 'Anios');
    assert.equal(resolveOccupationalDoctorLabel('Arts M. Stevens'), 'Arts');
    assert.equal(
      resolveOccupationalDoctorLabel('Bedrijfsarts K. Julien'),
      'Bedrijfsarts'
    );
  });

  it('expands VA/BA abbreviations before resolving label', () => {
    assert.equal(resolveOccupationalDoctorLabel('VA P. Mort'), 'Verzekeringsarts');
    assert.equal(resolveOccupationalDoctorLabel('BA K. Julien'), 'Bedrijfsarts');
  });

  it('uses primary role for supervisie phrases', () => {
    assert.equal(
      resolveOccupationalDoctorLabel(
        'Aios J. de Vries werkend onder supervisie van Bedrijfsarts K. Julien'
      ),
      'Aios'
    );
  });
});

describe('stripLeadingDoctorRolePrefix', () => {
  it('strips leading title for print value', () => {
    assert.equal(stripLeadingDoctorRolePrefix('Aios J. de Vries'), 'J. de Vries');
    assert.equal(
      stripLeadingDoctorRolePrefix('Verzekeringsarts A.J. Karim'),
      'A.J. Karim'
    );
  });

  it('leaves name-only values unchanged', () => {
    assert.equal(
      stripLeadingDoctorRolePrefix('S.V. Ramlochan-Tewari'),
      'S.V. Ramlochan-Tewari'
    );
  });
});

describe('buildSupervisiePhrase', () => {
  it('combines Arts primary with BA supervisor (Melissa case)', () => {
    assert.equal(
      buildSupervisiePhrase('M. Stevens', 'Arts', 'M. Montagne', 'BA'),
      'Arts M. Stevens werkend onder supervisie van Bedrijfsarts M. Montagne'
    );
  });

  it('combines Aios primary with BA supervisor', () => {
    assert.equal(
      buildSupervisiePhrase('J. de Vries', 'Aios', 'K. Julien', 'BA'),
      'Aios J. de Vries werkend onder supervisie van Bedrijfsarts K. Julien'
    );
  });

  it('returns primary only when no OSV name', () => {
    assert.equal(buildSupervisiePhrase('M. Stevens', 'Arts', null, null), 'Arts M. Stevens');
  });

  it('preserves verbatim supervisie sentence', () => {
    const input = 'Arts L. Bollen werkend onder supervisie van arts T. de Haas';
    assert.equal(buildSupervisiePhrase(input, 'Arts', 'T. de Haas', 'Arts'), input);
  });

  it('expands BA/VA in verbatim supervisie sentence', () => {
    assert.equal(
      buildSupervisiePhrase(
        'VA P. Mort werkend onder supervisie van BA K. Julien',
        'VA',
        'K. Julien',
        'BA'
      ),
      'Verzekeringsarts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien'
    );
  });
});

describe('enrichArtsOrgFromMeta', () => {
  it('returns artsOrg when it already has a role prefix and meta is a different doctor', () => {
    assert.equal(
      enrichArtsOrgFromMeta('Verzekeringsarts Ankersmit', 'Bedrijfsarts Other'),
      'Verzekeringsarts Ankersmit'
    );
  });

  it('merges supervisie from meta when spreekuur arts matches primary doctor (Melissa case)', () => {
    const meta =
      'Arts M. Stevens werkend onder supervisie van Bedrijfsarts M. Montagne';
    assert.equal(enrichArtsOrgFromMeta('Arts M. Stevens', meta), meta);
    assert.equal(enrichArtsOrgFromMeta('M. Stevens', meta), meta);
  });

  it('prepends role from meta when artsOrg is name-only and names match', () => {
    assert.equal(
      enrichArtsOrgFromMeta('Ankersmit', 'Verzekeringsarts Ankersmit'),
      'Verzekeringsarts Ankersmit'
    );
  });

  it('prepends role from meta when spreekuur name differs', () => {
    assert.equal(
      enrichArtsOrgFromMeta('C.J. de Bode', 'Verzekeringsarts Ankersmit'),
      'Verzekeringsarts C.J. de Bode'
    );
  });

  it('falls back to meta when artsOrg is empty', () => {
    assert.equal(
      enrichArtsOrgFromMeta(null, 'Verzekeringsarts Ankersmit'),
      'Verzekeringsarts Ankersmit'
    );
  });

  it('returns artsOrg when no meta prefix is available', () => {
    assert.equal(enrichArtsOrgFromMeta('Ankersmit', null), 'Ankersmit');
  });

  it('expands BA/VA when merging abbreviated meta supervisie', () => {
    assert.equal(
      enrichArtsOrgFromMeta(
        'P. Mort',
        'VA P. Mort werkend onder supervisie van BA K. Julien'
      ),
      'Verzekeringsarts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien'
    );
  });
});
