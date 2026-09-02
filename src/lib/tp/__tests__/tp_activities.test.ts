import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExWerknemerBijlage1Rule,
  BIJLAGE1_DETACHERING_NAME,
  formatSpoor2NotitieLabel,
  isSpoor2NotitieEligible,
  materializeSpoor2ForExWerknemer,
  normalizeTp3Activities,
  sanitizeSpoor2Selections,
  SPOOR2_DETACHERING_ID,
  TP_ACTIVITIES,
} from '../tp_activities';
import { SPOOR2_NOTITIE_ELIGIBLE_IDS } from '@/lib/tp2026/basis-spoor2-begeleiding';

describe('isSpoor2NotitieEligible', () => {
  it('returns true for the four eligible subsections', () => {
    for (const id of SPOOR2_NOTITIE_ELIGIBLE_IDS) {
      assert.ok(isSpoor2NotitieEligible(id));
    }
  });

  it('returns false for non-eligible subsections', () => {
    assert.ok(!isSpoor2NotitieEligible('verwerking-verlies-acceptatie'));
    assert.ok(!isSpoor2NotitieEligible('empowerment'));
    assert.ok(!isSpoor2NotitieEligible('orientatie'));
    assert.ok(!isSpoor2NotitieEligible('netwerken'));
    assert.ok(!isSpoor2NotitieEligible('solliciteren'));
  });
});

describe('formatSpoor2NotitieLabel', () => {
  it('preserves short text', () => {
    assert.equal(formatSpoor2NotitieLabel('Korte notitie.'), 'Korte notitie.');
  });

  it('truncates long text at word boundary with ellipsis', () => {
    const long =
      'Werknemer staat open om de mogelijkheden voor scholing of cursus te onderzoeken. Een cursus MS-Office zou van toegevoegde waarde kunnen zijn.';
    const label = formatSpoor2NotitieLabel(long);
    assert.ok(label.endsWith('…'));
    assert.ok(label.length <= 56);
    assert.match(label, /^Werknemer staat open om de mogelijkheden/);
  });
});

describe('TP_ACTIVITIES templates', () => {
  it('only attaches subTextTemplates to eligible activities', () => {
    const withTemplates = TP_ACTIVITIES.filter((a) => a.subTextTemplates?.length === 3);
    assert.equal(withTemplates.length, SPOOR2_NOTITIE_ELIGIBLE_IDS.length);
    for (const a of withTemplates) {
      assert.ok(isSpoor2NotitieEligible(a.id));
    }
  });
});

describe('sanitizeSpoor2Selections', () => {
  it('strips subText from non-eligible legacy selections', () => {
    const sanitized = sanitizeSpoor2Selections([
      { id: 'scholing', subText: 'Behouden.' },
      { id: 'verwerking-verlies-acceptatie', subText: 'Verwijderen.' },
    ]);
    assert.equal(sanitized[0].subText, 'Behouden.');
    assert.equal(sanitized[1].subText, null);
  });

  it('normalizes legacy string[] and sanitizes subText', () => {
    const normalized = normalizeTp3Activities([
      'scholing',
      'verwerking-verlies-acceptatie',
    ]);
    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].subText, null);
    assert.equal(normalized[1].subText, null);
  });
});

describe('ex-werknemer Spoor 2 rules', () => {
  it('builds default selections without detachering when requested', () => {
    const selections = materializeSpoor2ForExWerknemer(null, true);
    assert.ok(selections);
    assert.ok(selections!.length > 0);
    assert.ok(!selections!.some((s) => s.id === SPOOR2_DETACHERING_ID));
  });

  it('removes detachering from existing selections for ex-werknemer', () => {
    const raw = [{ id: 'netwerken' }, { id: SPOOR2_DETACHERING_ID }, { id: 'scholing' }];
    const selections = materializeSpoor2ForExWerknemer(raw, true);
    assert.ok(selections);
    assert.deepEqual(
      selections!.map((s) => s.id),
      ['netwerken', 'scholing']
    );
  });

  it('leaves selections unchanged when not ex-werknemer', () => {
    assert.equal(materializeSpoor2ForExWerknemer(null, false), null);
  });
});

describe('ex-werknemer Bijlage 1 rules', () => {
  it('removes Detachering onderzoeken from phases for ex-werknemer', () => {
    const phases = [
      {
        title: 'Betaald werk',
        period_from: '',
        period_to: '',
        activities: [
          { name: 'Jobhunten', status: 'P' as const },
          { name: BIJLAGE1_DETACHERING_NAME, status: 'P' as const },
          { name: 'Begeleiding WIA', status: 'P' as const },
        ],
      },
    ];
    const next = applyExWerknemerBijlage1Rule(phases, true);
    assert.deepEqual(
      next[0].activities.map((a) => a.name),
      ['Jobhunten', 'Begeleiding WIA']
    );
  });

  it('leaves phases unchanged when not ex-werknemer', () => {
    const phases = [
      {
        title: 'Betaald werk',
        period_from: '',
        period_to: '',
        activities: [{ name: BIJLAGE1_DETACHERING_NAME, status: 'P' as const }],
      },
    ];
    assert.deepEqual(applyExWerknemerBijlage1Rule(phases, false), phases);
  });
});
