import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { buildVgrBodyAtoms, splitVgrBodyAtom, type VGRBodyAtom } from '@/lib/vgr/body-atoms';

function draft() {
  return ensureVGRShape({
    first_name: 'Ceciliea',
    last_name: 'de Ridder',
    vgr_meta: { period_start: '2026-09-04', period_end: '2026-10-28', report_date: '2026-10-28' },
    body: {
      kwaliteiten_onderzoek: {
        selected: ['persoonlijkheidstest', 'beroepen_arbeidsmarkt'],
        persoonlijkheid_scores: { emotionele_stabiliteit: '72' },
        persoonlijkheid_teksten: {
          emotionele_stabiliteit: 'Werknemer herstelt na een tegenslag.',
        },
        beroepen: ['Administratief medewerker', 'Receptionist'],
        beroepen_conclusie: 'Eerste alinea van de conclusie.\n\nTweede alinea van de conclusie.',
      },
      scholing: { selected: ['taal'] },
      sollicitatie_vaardigheden: {
        selected: ['webinars'],
        vervolg_activiteiten: 'Netwerken afronden',
        blocks: { webinars: { items: ['Webinar solliciteren'], standaardtekst: true } },
      },
      interventies_activatie: { vervolg_activiteiten: 'Solliciteren op interne vacatures' },
    },
  });
}

function markup(atom: VGRBodyAtom | undefined): string {
  assert.ok(atom, 'missing atom');
  return renderToStaticMarkup(atom.node as Parameters<typeof renderToStaticMarkup>[0]);
}

describe('fase oriëntatie layout', () => {
  const atoms = buildVgrBodyAtoms(draft());
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const all = atoms.map((a) => renderToStaticMarkup(a.node as Parameters<typeof renderToStaticMarkup>[0])).join('\n');

  it('puts the chapter intro and scholing intro in their own panels', () => {
    assert.equal(byId.get('or-alg-h')?.panel, 'or-alg');
    assert.equal(byId.get('or-alg')?.panel, 'or-alg');
    const label = markup(byId.get('or-alg-h'));
    assert.match(label, /Algemene toelichting/);
    assert.match(label, /text-\[#782A90\]/);
    assert.match(label, /font-bold/);
    assert.equal(byId.get('sc-alg-h')?.panel, 'sc-alg');
    assert.equal(byId.get('sc-alg')?.panel, 'sc-alg');
    assert.match(markup(byId.get('sc-alg')), /redelijkheid en billijkheid/);
  });

  it('keeps section titles, leads and checkboxes on the white page', () => {
    for (const id of ['ko-h', 'ko-lead', 'ko-checks', 'sc-h', 'sc-checks', 'sv-h', 'sv-lead', 'sv-checks']) {
      assert.equal(byId.get(id)?.panel, undefined, id);
    }
    const lead = markup(byId.get('ko-lead'));
    assert.match(lead, /Onderstaande interventies zijn ingezet op het vlak van het kwaliteiten/);
    assert.doesNotMatch(lead, /text-\[#782A90\]/);
    assert.doesNotMatch(markup(byId.get('sv-lead')), /text-\[#782A90\]/);
  });

  it('keeps personality scores, trait text and beroepen inside their panels with Z marks', () => {
    assert.equal(byId.get('ko-persoonlijkheidstest-h')?.panel, 'ko-persoonlijkheidstest');
    assert.equal(byId.get('ko-pt-scores')?.panel, 'ko-persoonlijkheidstest');
    assert.equal(byId.get('ko-pt-emotionele_stabiliteit-h')?.panel, 'ko-persoonlijkheidstest');
    assert.equal(byId.get('ko-pt-emotionele_stabiliteit')?.panel, 'ko-persoonlijkheidstest');
    assert.equal(byId.get('ko-pt-extraversie-h'), undefined);
    const scores = markup(byId.get('ko-pt-scores'));
    assert.match(scores, /val-logo\.jpg/);
    assert.match(scores, /Emotionele stabiliteit: 72%/);
    const trait = markup(byId.get('ko-pt-emotionele_stabiliteit-h'));
    assert.match(trait, /Emotionele stabiliteit: 72%/);
    assert.match(trait, /text-\[#782A90\]/);

    for (const id of ['ko-beroepen_arbeidsmarkt-h', 'ko-ber-list', 'ko-ber-crit', 'ko-ber-conc-h', 'ko-ber-conc']) {
      assert.equal(byId.get(id)?.panel, 'ko-beroepen_arbeidsmarkt', id);
    }
    const beroepen = markup(byId.get('ko-ber-list'));
    assert.match(beroepen, /val-logo\.jpg/);
    assert.match(beroepen, /En vergelijkbaar/);
    assert.match(beroepen, /Administratief medewerker/);
    const criteria = markup(byId.get('ko-ber-crit'));
    assert.match(criteria, /val-logo\.jpg/);
    assert.match(criteria, /text-\[#782A90\]/);
    assert.match(criteria, /Persoonsprofiel/);
    assert.match(criteria, /Belastbaarheidsprofiel FML/);
    assert.match(criteria, /Zoekprofiel/);
    assert.match(criteria, /Doel: vaststellen/);
    assert.match(markup(byId.get('ko-ber-conc-h')), /Conclusie/);
    assert.doesNotMatch(all, /Plaats hier de beschrijving/);
    assert.doesNotMatch(all, /Hier onderbouwen/);
  });

  it('copies the beroepen panel id when the conclusie splits', () => {
    const atom = byId.get('ko-ber-conc');
    assert.ok(atom);
    const parts = splitVgrBodyAtom(atom);
    assert.ok(parts);
    assert.equal(parts.length, 2);
    assert.equal(parts[0].panel, 'ko-beroepen_arbeidsmarkt');
    assert.equal(parts[1].panel, 'ko-beroepen_arbeidsmarkt');
  });

  it('renders Taal links as purple Z rows and webinar rows as black Z rows', () => {
    assert.equal(byId.get('sc-taal-h')?.panel, 'sc-taal');
    assert.equal(byId.get('sc-taal-items')?.panel, 'sc-taal');
    assert.equal(byId.get('sc-taal-il')?.panel, 'sc-taal');
    const links = markup(byId.get('sc-taal-items'));
    assert.match(links, /val-logo\.jpg/);
    assert.match(links, /www\.oefenen\.nl/);
    assert.match(links, /text-\[#782A90\]/);
    assert.match(links, /font-bold/);
    const taalLead = markup(byId.get('sc-taal-il'));
    assert.match(taalLead, /beknopte links en instructies/);
    assert.doesNotMatch(taalLead, /text-\[#782A90\]/);

    assert.equal(byId.get('sv-webinars-items')?.panel, 'sv-webinars');
    const webinars = markup(byId.get('sv-webinars-items'));
    assert.match(webinars, /val-logo\.jpg/);
    assert.match(webinars, /Webinar solliciteren/);
    assert.doesNotMatch(webinars, /text-\[#782A90\]/);
    assert.doesNotMatch(all, /Let op: controleer bij inzet/);
  });

  it('puts the sollicitatie vervolg in a panel and leaves activatie unpaneled', () => {
    assert.equal(byId.get('sv-vervolg-lead')?.panel, 'sv-vervolg');
    assert.equal(byId.get('sv-vervolg-text')?.panel, 'sv-vervolg');
    const vervolgLead = markup(byId.get('sv-vervolg-lead'));
    assert.match(vervolgLead, /Onderstaande activiteiten komen in fase 2\/3/);
    assert.match(vervolgLead, /text-\[#782A90\]/);
    const vervolg = markup(byId.get('sv-vervolg-text'));
    assert.match(vervolg, /val-logo\.jpg/);
    assert.match(vervolg, /Netwerken afronden/);

    assert.equal(byId.get('ac-alg')?.panel, undefined);
    assert.equal(byId.get('ia-h')?.panel, undefined);
    assert.equal(byId.get('ia-vervolg-lead')?.panel, undefined);
    assert.match(markup(byId.get('ia-vervolg-lead')), /Onderstaande activiteiten komen in fase 2\/3/);
    assert.match(markup(byId.get('ia-vervolg-text')), /Solliciteren op interne vacatures/);
    assert.doesNotMatch(markup(byId.get('ia-vervolg-text')), /val-logo\.jpg/);
  });
});
