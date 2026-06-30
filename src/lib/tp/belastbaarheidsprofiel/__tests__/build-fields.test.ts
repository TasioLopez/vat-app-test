import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBelastbaarheidsprofielFields } from '../build-fields';
import { PROGNOSE_DELIMITER } from '../constants';
import type { BelastbaarheidsprofielContentResult } from '../schema';

const nikkiCtx = {
  meta: {
    fml_izp_lab_date: '2026-01-23',
    occupational_doctor_org:
      'Arts L. Bollen werkend onder supervisie van arts T. de Haas',
  },
};

describe('buildBelastbaarheidsprofielFields', () => {
  it('assembles FML intro, rubrieken, spreekuur intro and prognose block', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Persoonlijk functioneren', 'Werktijden'],
      prognose_citaat:
        'Op basis van de huidige ontvangen informatie is de geschatte prognose positief.',
      reintegratieadvies_citaat: 'Werknemer kan deels hervatten in aangepast werk.',
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);

    assert.match(prognose_bedrijfsarts, /Functionele Mogelijkheden Lijst \(FML\) van 23 januari 2026/);
    assert.match(
      prognose_bedrijfsarts,
      /Arts L\. Bollen werkend onder supervisie van arts T\. de Haas/
    );
    assert.match(prognose_bedrijfsarts, /• Persoonlijk functioneren/);
    assert.match(prognose_bedrijfsarts, /medisch spreekuur/);
    assert.ok(prognose_bedrijfsarts.includes(PROGNOSE_DELIMITER));

    const prognosePart = prognose_bedrijfsarts.split(PROGNOSE_DELIMITER)[1] ?? '';
    const prognoseIdx = prognosePart.indexOf('positief');
    const reintIdx = prognosePart.indexOf('aangepast werk');
    assert.ok(prognoseIdx >= 0 && reintIdx >= 0);
    assert.ok(prognoseIdx < reintIdx, 'prognose quote should come before reintegratieadvies');
  });

  it('preserves supervisie doctor phrase verbatim', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Sociaal functioneren'],
      prognose_citaat: 'Prognose tekst.',
      reintegratieadvies_citaat: null,
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);
    assert.match(
      prognose_bedrijfsarts,
      /opgesteld door Arts L\. Bollen werkend onder supervisie van arts T\. de Haas, beperkingen/
    );
    assert.match(
      prognose_bedrijfsarts,
      /door Arts L\. Bollen werkend onder supervisie van arts T\. de Haas, staat onderstaande/
    );
  });

  it('uses default rubrieken when model returns empty list', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: [],
      prognose_citaat: null,
      reintegratieadvies_citaat: null,
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);
    assert.match(prognose_bedrijfsarts, /• Persoonlijk functioneren/);
    assert.match(prognose_bedrijfsarts, /• Werktijden/);
  });
});
