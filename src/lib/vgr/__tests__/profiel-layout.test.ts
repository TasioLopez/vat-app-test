import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { buildVgrBodyAtoms, splitVgrBodyAtom, type VGRBodyAtom } from '@/lib/vgr/body-atoms';

function draft() {
  return ensureVGRShape({
    first_name: 'Ceciliea',
    last_name: 'de Ridder',
    date_of_birth: '1993-07-19',
    vgr_meta: { period_start: '2026-09-04', period_end: '2026-10-28', report_date: '2026-10-28' },
    body: {
      benutbare_mogelijkheden: {
        heeft: true,
        prognose: { bron_naam: 'S. de Beaufort', bron_datum: '2026-09-22', bron_type: 'de terugkoppeling van het spreekuur', citaat: 'Herstel op korte termijn.' },
        conclusie: { bron_naam: 'S. de Beaufort', bron_datum: '2026-09-22', bron_type: 'de terugkoppeling van het spreekuur', citaat: 'Belastbaarheid is toegenomen.' },
        advies: { bron_naam: 'S. de Beaufort', bron_datum: '2026-09-22', bron_type: 'de terugkoppeling van het spreekuur', citaat: 'Leg de afspraken vast.' },
        eerdere_prognose: 'Oude prognose uit het trajectplan.',
      },
      praktische_belemmeringen: { aanwezig: true, toelichting: 'Werknemer ervaart een financiële druk.' },
      doelstelling_traject: {
        huidige: 'activering',
        bij_intake: 'activering',
        history: [{ id: 'now', date: '2026-10-28', from: 'activering', to: 'activering', changed: false, toelichting: '' }],
        toelichting: 'Eerste alinea van de doelstelling.\n\nTweede alinea van de doelstelling.',
      },
      persoonlijk_profiel: { tekst: 'Persoonlijk profiel tekst.' },
      belastbaarheidsprofiel: {
        kind: 'izp',
        datum: '2026-04-21',
        auteur: 'C.J.E. van Oers',
        rubrieken: ['Persoonlijk functioneren', 'Werktijden'],
        toelichting: 'Blijvende beperking in werktijden.\n\nTweede alinea over de rubrieken.',
      },
      bijstellingen_belastbaarheid: {
        aanwezig: true,
        revisions: [
          {
            id: 'r1',
            kind: 'izp',
            auteur: 'S. de Beaufort',
            date: '2026-09-22',
            rubrieken: ['Persoonlijk functioneren'],
            toelichting: 'De beperking voor stress wordt niet meer genoemd.',
          },
        ],
      },
      wijzigingen_doelstelling: { aanwezig: false, toelichting: 'Dit mag niet in de rapportage.' },
      zoekprofiel: { tekst: 'Zoekprofiel tekst.' },
    },
  });
}

function markup(atom: VGRBodyAtom | undefined): string {
  assert.ok(atom, 'missing atom');
  return renderToStaticMarkup(atom.node as Parameters<typeof renderToStaticMarkup>[0]);
}

describe('profiel werknemer layout', () => {
  const atoms = buildVgrBodyAtoms(draft());
  const byId = new Map(atoms.map((a) => [a.id, a]));

  it('puts the period line above the chapter bar', () => {
    assert.equal(atoms[0].id, 'periode');
    assert.equal(atoms[0].pageBreakBefore, true);
    assert.equal(atoms[1].id, 'ch-profiel');
    assert.equal(atoms[1].pageBreakBefore, undefined);
    const html = markup(atoms[0]);
    assert.match(html, /Voortgangsrapportage periode:/);
    assert.match(html, /text-\[#782A90\]/);
    assert.doesNotMatch(html, /text-neutral-900/);
  });

  it('puts the five vragen in one panel with Z marks, and the title outside it', () => {
    const title = markup(byId.get('vraag-h'));
    assert.match(title, /Vraagstelling/);
    assert.match(title, /text-\[11pt\]/);
    assert.match(title, /text-\[#782A90\]/);
    const list = byId.get('vraag-list');
    assert.equal(list?.panel, 'vraag');
    const html = markup(list);
    assert.match(html, /val-logo\.jpg/);
    assert.match(html, /Welke re-integratieactiviteiten/);
    assert.doesNotMatch(html, /list-disc/);
  });

  it('keeps prognose, conclusie and advies in one panel with bold purple leads and plain quotes', () => {
    for (const id of ['bm-prog-h', 'bm-prog-lead', 'bm-prog-q', 'bm-eerder-lead', 'bm-eerder', 'bm-conc-h', 'bm-conc-lead', 'bm-conc-q', 'bm-adv-h', 'bm-adv-lead', 'bm-adv-q']) {
      assert.equal(byId.get(id)?.panel, 'bm-quotes', id);
    }
    assert.equal(byId.get('bm-jn')?.panel, undefined);
    const lead = markup(byId.get('bm-prog-lead'));
    assert.match(lead, /text-\[#782A90\]/);
    assert.match(lead, /font-bold/);
    assert.match(lead, /staat de volgende prognose/);
    const quote = markup(byId.get('bm-prog-q'));
    assert.match(quote, /Herstel op korte termijn/);
    assert.doesNotMatch(quote, /italic/);
  });

  it('places each later profiel block in its own panel and drops the extra doelstelling heading', () => {
    assert.equal(byId.get('pb-toel-h')?.panel, 'pb-toel');
    assert.equal(byId.get('pb-toel')?.panel, 'pb-toel');
    assert.equal(byId.get('dt-toel-h'), undefined);
    assert.equal(byId.get('dt-history')?.panel, 'dt');
    assert.equal(byId.get('dt-toel')?.panel, 'dt');
    assert.match(markup(byId.get('dt-history')), /Doelstelling /);
    assert.match(markup(byId.get('dt-history')), /text-\[#782A90\]/);
    assert.equal(byId.get('pp-text')?.panel, 'pp');
    assert.equal(byId.get('bp-intro')?.panel, 'bp');
    assert.equal(byId.get('bp-rubrieken')?.panel, 'bp');
    assert.equal(byId.get('bp-toel')?.panel, 'bp');
    assert.match(markup(byId.get('bp-intro')), /font-bold/);
    assert.equal(byId.get('bb-rev-r1-intro')?.panel, 'bb');
    assert.equal(byId.get('bb-rev-r1-rub')?.panel, 'bb');
    assert.equal(byId.get('bb-rev-r1-toel-h')?.panel, 'bb');
    assert.equal(byId.get('bb-rev-r1-toel')?.panel, 'bb');
    assert.equal(byId.get('wd-toel'), undefined);
    assert.equal(byId.get('zp-text')?.panel, 'zp');
  });

  it('copies the panel id when a toelichting splits across a page', () => {
    const atom = byId.get('bp-toel');
    assert.ok(atom);
    const parts = splitVgrBodyAtom(atom);
    assert.ok(parts);
    assert.equal(parts.length, 2);
    assert.equal(parts[0].panel, 'bp');
    assert.equal(parts[1].panel, 'bp');
  });
});
