import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildArtsPhrase, buildSupervisiePhrase, enrichArtsOrgFromMeta } from '../format-context';

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

describe('buildSupervisiePhrase', () => {
  it('combines Arts primary with BA supervisor (Melissa case)', () => {
    assert.equal(
      buildSupervisiePhrase('M. Stevens', 'Arts', 'M. Montagne', 'BA'),
      'Arts M. Stevens werkend onder supervisie van Bedrijfsarts M. Montagne'
    );
  });

  it('returns primary only when no OSV name', () => {
    assert.equal(buildSupervisiePhrase('M. Stevens', 'Arts', null, null), 'Arts M. Stevens');
  });

  it('preserves verbatim supervisie sentence', () => {
    const input = 'Arts L. Bollen werkend onder supervisie van arts T. de Haas';
    assert.equal(buildSupervisiePhrase(input, 'Arts', 'T. de Haas', 'Arts'), input);
  });
});

describe('enrichArtsOrgFromMeta', () => {
  it('returns artsOrg when it already has a role prefix', () => {
    assert.equal(
      enrichArtsOrgFromMeta('Verzekeringsarts Ankersmit', 'Bedrijfsarts Other'),
      'Verzekeringsarts Ankersmit'
    );
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
});
