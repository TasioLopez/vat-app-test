import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVgrInitialData, hydrateVgrFromPriorReport, hydrateVgrFromTp2026 } from '@/lib/vgr/migrate-from-tp';
import { ensureVGRShape } from '@/lib/vgr/mapping';

describe('hydrateVgrFromTp2026', () => {
  it('copies TP prose and planning but never invents applications', () => {
    const draft = ensureVGRShape({ first_name: 'A', last_name: 'B' });
    const next = hydrateVgrFromTp2026(draft, {
      persoonlijk_profiel: 'Profiel uit TP.',
      zoekprofiel: 'Zoekprofiel uit TP.',
      praktische_belemmeringen: 'Geen praktische belemmeringen bekend.',
      fml_izp_lab_kind: 'FML',
      fml_izp_lab_date: '2026-03-20',
      first_sick_day: '2025-01-10',
      bijlage1_phases: [
        {
          title: 'Oriëntatie',
          activities: [{ name: 'Empowerment', status: 'G' }],
        },
      ],
    });
    assert.equal(next.body.persoonlijk_profiel.tekst, 'Profiel uit TP.');
    assert.equal(next.body.zoekprofiel.tekst, 'Zoekprofiel uit TP.');
    assert.equal(next.body.praktische_belemmeringen.aanwezig, false);
    assert.equal(next.body.belastbaarheidsprofiel.datum, '2026-03-20');
    assert.notEqual(next.body.belastbaarheidsprofiel.datum, '2025-01-10');
    assert.equal(next.planning_phases[0].activities[0].status, 'G');
    assert.deepEqual(next.applications, []);
  });

  it('does not overwrite adviser-entered VGR prose', () => {
    const draft = ensureVGRShape({ body: { persoonlijk_profiel: { tekst: 'Handmatig.' } } });
    const next = hydrateVgrFromTp2026(draft, { persoonlijk_profiel: 'Uit TP.' });
    assert.equal(next.body.persoonlijk_profiel.tekst, 'Handmatig.');
  });
});

describe('hydrateVgrFromPriorReport', () => {
  it('carries history forward and increments version without copying applications', () => {
    const prior = ensureVGRShape({
      vgr_meta: { version: 1, period_end: '2026-03-31' },
      body: {
        persoonlijk_profiel: { tekst: 'Was al bekend.' },
        doelstelling_traject: {
          huidige: 'activering',
          bij_intake: 'arbeidsmarkt_orientatie',
          history: [{ id: 'g1', date: '2026-02-01', from: 'arbeidsmarkt_orientatie', to: 'activering', changed: true }],
        },
        pow: { intake_trede: 2, huidige_trede: 3, history: [{ id: 'p1', date: '2026-03-31', toelichting: 'Toen trede 3.' }] },
        leernavigator: { basis: [{ id: 'cv', checked: true }] },
      },
      applications: [{ date: '2026-03-01', organisatie: 'Oud', functie: 'X' }],
    });
    const draft = ensureVGRShape({});
    const next = hydrateVgrFromPriorReport(draft, prior, 'prior-id', 'export-id');
    assert.equal(next.vgr_meta.version, 2);
    assert.equal(next.vgr_meta.prior_vgr_instance_id, 'prior-id');
    assert.equal(next.vgr_meta.period_start, '2026-03-31');
    assert.equal(next.body.persoonlijk_profiel.tekst, 'Was al bekend.');
    assert.equal(next.body.doelstelling_traject.history.length, 1);
    assert.equal(next.body.pow.history[0].toelichting, 'Toen trede 3.');
    assert.deepEqual(next.applications, []);
  });
});

describe('buildVgrInitialData', () => {
  it('fills blanks from employee + TP and leaves applications empty', () => {
    const out = buildVgrInitialData(
      {},
      {
        employee: { first_name: 'Sam', last_name: 'Tester', email: 'sam@example.test' },
        details: { date_of_birth: '1988-05-05', current_job: 'Monteur' },
        tpData: { zoekprofiel: 'Magazijnmedewerker', first_sick_day: '2025-02-02' },
      }
    );
    assert.equal(out.first_name, 'Sam');
    assert.equal(out.current_job, 'Monteur');
    assert.equal(out.body.zoekprofiel.tekst, 'Magazijnmedewerker');
    assert.equal(out.first_sick_day, '2025-02-02');
    assert.deepEqual(out.applications, []);
  });
});
