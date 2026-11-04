import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { buildVgrBodyAtoms, splitVgrBodyAtom, type VGRBodyAtom } from '@/lib/vgr/body-atoms';

function draft() {
  return ensureVGRShape({
    first_name: 'Ceciliea',
    last_name: 'de Ridder',
    occupational_doctor_name: 'G. Verheul',
    has_ad_report: true,
    vgr_meta: { period_start: '2026-09-04', period_end: '2026-10-28', report_date: '2026-10-28' },
    body: {
      interventies_activatie: {
        selected: ['wekelijks_solliciteren', 'jobhunting'],
        vervolg_activiteiten: 'Netwerken afronden',
        blocks: {
          wekelijks_solliciteren: { standaardtekst: true, toelichting: 'Werknemer solliciteert wekelijks.' },
          jobhunting: { standaardtekst: true },
        },
      },
      pow: {
        intake_trede: 2,
        huidige_trede: 3,
        history: [
          {
            id: 'pow-1',
            date: '2026-09-17',
            toelichting: 'Eerste alinea van de onderbouwing.\n\nTweede alinea van de onderbouwing.',
          },
        ],
      },
      visie_plaatsbaarheid: {
        kansen: 'goed',
        functies: ['Taalredacteur', 'Toetsontwikkelaar'],
        conclusie: 'Eerste alinea van de conclusie.\n\nTweede alinea van de conclusie.',
        ad: {
          bron_naam: 'G. Verheul',
          bron_datum: '2026-05-31',
          citaat: 'Er zijn een beperkt aantal theoretisch passende functies.',
        },
      },
    },
  });
}

function markup(atom: VGRBodyAtom | undefined): string {
  assert.ok(atom, 'missing atom');
  return renderToStaticMarkup(atom.node as Parameters<typeof renderToStaticMarkup>[0]);
}

describe('fase activatie layout', () => {
  const atoms = buildVgrBodyAtoms(draft());
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const all = atoms.map((a) => renderToStaticMarkup(a.node as Parameters<typeof renderToStaticMarkup>[0])).join('\n');

  it('puts the chapter intro in a panel and leaves the interventie title and checklist outside', () => {
    assert.equal(byId.get('ac-alg-h')?.panel, 'ac-alg');
    assert.equal(byId.get('ac-alg')?.panel, 'ac-alg');
    assert.match(markup(byId.get('ac-alg-h')), /text-\[#782A90\]/);
    assert.equal(byId.get('ia-h')?.panel, undefined);
    assert.equal(byId.get('ia-checks')?.panel, undefined);
  });

  it('panels the vervolg and each selected intervention, with the bijlage sentence in italic purple', () => {
    assert.equal(byId.get('ia-vervolg-lead')?.panel, 'ia-vervolg');
    assert.equal(byId.get('ia-vervolg-text')?.panel, 'ia-vervolg');
    assert.match(markup(byId.get('ia-vervolg-text')), /val-logo\.jpg/);
    assert.match(markup(byId.get('ia-vervolg-text')), /Netwerken afronden/);

    for (const id of ['ia-wekelijks_solliciteren-h', 'ia-wekelijks_solliciteren-std-0', 'ia-wekelijks_solliciteren-std-1', 'ia-wekelijks_solliciteren-toel']) {
      assert.equal(byId.get(id)?.panel, 'ia-wekelijks_solliciteren', id);
    }
    const first = markup(byId.get('ia-wekelijks_solliciteren-std-0'));
    assert.match(first, /primaire verantwoordelijkheid/);
    assert.doesNotMatch(first, /text-\[#660066\]/);
    const bijlage = markup(byId.get('ia-wekelijks_solliciteren-std-1'));
    assert.match(bijlage, /zie bijlage 2/);
    assert.match(bijlage, /italic/);
    assert.match(bijlage, /text-\[#660066\]/);
    assert.equal(byId.get('ia-jobhunting-h')?.panel, 'ia-jobhunting');
    assert.equal(byId.get('ia-jobhunting-std-0')?.panel, 'ia-jobhunting');
    assert.doesNotMatch(all, /Indien bovenstaande afwijkt/);
    assert.doesNotMatch(all, /Voorbeeld tekst/);
    assert.doesNotMatch(all, /Onderbouw hier waarom/);
  });

  it('puts perspectief and the PoW text in separate panels and keeps the chart on the white page', () => {
    assert.equal(byId.get('pw-h')?.panel, undefined);
    assert.equal(byId.get('pw-chart-h')?.panel, undefined);
    assert.equal(byId.get('pw-chart')?.panel, undefined);
    assert.equal(byId.get('pw-ins-h')?.panel, undefined);
    assert.equal(byId.get('pw-alg-h')?.panel, 'pw-alg');
    assert.equal(byId.get('pw-alg')?.panel, 'pw-alg');
    assert.equal(byId.get('pw-pow-h')?.panel, 'pw-pow');
    assert.equal(byId.get('pw-pow')?.panel, 'pw-pow');
    const chart = markup(byId.get('pw-chart'));
    assert.match(chart, /text-\[#782A90\]/);
    assert.match(chart, /italic/);
    const table = markup(byId.get('pw-ins-table'));
    assert.match(table, /text-\[#782A90\]/);
    assert.match(table, /bg-\[#f3efe4\]/);
    assert.doesNotMatch(table, /text-\[#702A90\]/);
  });

  it('keeps the PoW toelichting in one panel, including a split', () => {
    assert.equal(byId.get('pw-toel-h')?.panel, 'pw-toel');
    assert.equal(byId.get('pw-m-pow-1-h')?.panel, 'pw-toel');
    assert.equal(byId.get('pw-m-pow-1')?.panel, 'pw-toel');
    assert.match(markup(byId.get('pw-toel-h')), /Toelichting onderbouwing PoW-meter/);
    const parts = splitVgrBodyAtom(byId.get('pw-m-pow-1')!);
    assert.ok(parts);
    assert.equal(parts.length, 2);
    assert.equal(parts[0].panel, 'pw-toel');
    assert.equal(parts[1].panel, 'pw-toel');
  });

  it('keeps the visie body in one panel, with a purple quote and Z-mark functies', () => {
    assert.equal(byId.get('vp-h')?.panel, undefined);
    for (const id of ['vp-ad-lead', 'vp-ad-q', 'vp-la-h', 'vp-kansen', 'vp-fun-lead', 'vp-fun-list', 'vp-fun-foot', 'vp-conc-h', 'vp-conc']) {
      assert.equal(byId.get(id)?.panel, 'vp', id);
    }
    const quote = markup(byId.get('vp-ad-q'));
    assert.match(quote, /italic/);
    assert.match(quote, /text-\[#782A90\]/);
    assert.match(quote, /theoretisch passende functies/);
    const functies = markup(byId.get('vp-fun-list'));
    assert.match(functies, /val-logo\.jpg/);
    assert.match(functies, /Taalredacteur/);
    assert.doesNotMatch(functies, /list-disc/);
    const foot = markup(byId.get('vp-fun-foot'));
    assert.match(foot, /text-\[#782A90\]/);
    assert.match(foot, /italic/);
    const parts = splitVgrBodyAtom(byId.get('vp-conc')!);
    assert.ok(parts);
    assert.equal(parts[0].panel, 'vp');
    assert.equal(parts[1].panel, 'vp');
  });

  it('puts the Leernavigator titles on a cream strip and the intro on the white page', () => {
    assert.equal(byId.get('ln-h')?.panel, undefined);
    assert.equal(byId.get('ln-intro')?.panel, undefined);
    const grid = markup(byId.get('ln-grid'));
    assert.match(grid, /bg-\[#F3EFE4\]/);
    assert.match(grid, /Basisinterventies ontwikkeling/);
    assert.match(grid, /Activeringsinterventies/);
    assert.match(grid, /text-\[#782A90\]/);
    assert.match(grid, /De eigen talenten en valkuilen/);
  });
});
