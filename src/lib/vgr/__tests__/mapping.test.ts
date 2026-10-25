import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureVGRShape,
  migrateLegacyBijlage2ToLeernavigator,
  normalizeApplications,
  normalizeInterventionSection,
  vgrDraftIsEmpty,
} from '@/lib/vgr/mapping';
import { VGR_SCHEMA_VERSION } from '@/lib/vgr/schema';
import { VGR_MOTIVATIE_OPTIONS, createLeernavigatorItems, VGR_LEERNAVIGATOR_BASIS_DEFS } from '@/lib/vgr/content';
import { VGR_PLANNING_PHASE_DEFS } from '@/lib/vgr/planning-defaults';

describe('ensureVGRShape', () => {
  it('applies full v2 defaults for empty payload', () => {
    const shaped = ensureVGRShape({});
    assert.equal(shaped.vgr_meta.schema_version, VGR_SCHEMA_VERSION);
    assert.equal(shaped.vgr_meta.version, 1);
    assert.match(shaped.vgr_meta.report_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(shaped.body.benutbare_mogelijkheden.heeft, null);
    assert.equal(shaped.body.pow.intake_trede, null);
    assert.equal(shaped.planning_phases.length, 3);
    assert.equal(shaped.planning_phases[0].activities.length, VGR_PLANNING_PHASE_DEFS[0].activities.length);
    assert.deepEqual(shaped.applications, []);
    assert.equal(shaped.body.leernavigator.basis.length, VGR_LEERNAVIGATOR_BASIS_DEFS.length);
    assert.equal(shaped.body.leernavigator.activering.length, 11);
  });

  it('is idempotent and preserves adviser prose', () => {
    const once = ensureVGRShape({
      first_name: '  Test ',
      body: { persoonlijk_profiel: { tekst: 'Vrije tekst.' }, pow: { huidige_trede: 3 } },
    });
    const twice = ensureVGRShape(once);
    assert.equal(twice.first_name, 'Test');
    assert.equal(twice.body.persoonlijk_profiel.tekst, 'Vrije tekst.');
    assert.equal(twice.body.pow.huidige_trede, 3);
    assert.deepEqual(twice.body, once.body);
  });

  it('migrates the legacy bijlage2 stub into Leernavigator checks and drops legacy keys', () => {
    const shaped = ensureVGRShape({
      bijlage2_model: {
        kunnen: [{ label: 'Opstellen verzorgd C.V.', checked: true }],
        doen: [{ label: 'Sollicitatieactiviteit (1 x per week)', checked: true }],
      },
      bijlage3_decisions: [{ id: 'b3_step_1' }],
      bijlage3_page2: { doelJa: true },
    });
    assert.equal('bijlage2_model' in shaped, false);
    assert.equal('bijlage3_decisions' in shaped, false);
    assert.equal('bijlage3_page2' in shaped, false);
    const checked = shaped.body.leernavigator.basis.filter((i) => i.checked).map((i) => i.id);
    assert.deepEqual(checked.sort(), ['cv', 'sollicitatie_week']);
  });

  it('derives wijzigingen_doelstelling from goal history', () => {
    const shaped = ensureVGRShape({
      body: {
        doelstelling_traject: {
          history: [{ id: 'g1', date: '2026-03-01', from: 'activering', to: 'betaald_werk', changed: true }],
        },
      },
    });
    assert.equal(shaped.body.wijzigingen_doelstelling.aanwezig, true);
  });
});

describe('migrateLegacyBijlage2ToLeernavigator', () => {
  it('ignores unchecked and unknown rows', () => {
    const basis = createLeernavigatorItems(VGR_LEERNAVIGATOR_BASIS_DEFS);
    const out = migrateLegacyBijlage2ToLeernavigator(
      { willen: [{ label: 'Onbekend', checked: true }, { label: 'Inzicht in zoekprofiel', checked: false }] },
      basis
    );
    assert.equal(out.some((i) => i.checked), false);
  });
});

describe('normalizeInterventionSection', () => {
  it('maps legacy labels/aliases to option ids', () => {
    const out = normalizeInterventionSection(
      { selected: ['Coaching bij verlies en acceptatie', 'empowerment'], blocks: { Empowerment: { toelichting: 'x' } } },
      VGR_MOTIVATIE_OPTIONS
    );
    assert.deepEqual(out.selected, ['rouwproces', 'empowerment']);
    assert.equal(out.blocks.empowerment.toelichting, 'x');
    assert.equal(out.blocks.empowerment.standaardtekst, true);
  });
});

describe('normalizeApplications', () => {
  it('derives month_key and sorts chronologically', () => {
    const out = normalizeApplications([
      { date: '2026-05-10', functie: 'B' },
      { date: '2026-04-02', functie: 'A' },
    ]);
    assert.equal(out[0].functie, 'A');
    assert.equal(out[0].month_key, '2026-04');
    assert.equal(out[1].month_key, '2026-05');
    assert.ok(out[0].id);
  });
});

describe('vgrDraftIsEmpty', () => {
  it('is true for fresh defaults and false once prose exists', () => {
    assert.equal(vgrDraftIsEmpty(ensureVGRShape({ first_name: 'A' })), true);
    assert.equal(vgrDraftIsEmpty(ensureVGRShape({ body: { zoekprofiel: { tekst: 'x' } } })), false);
    assert.equal(vgrDraftIsEmpty(ensureVGRShape({ applications: [{ date: '2026-01-01' }] })), false);
  });
});
