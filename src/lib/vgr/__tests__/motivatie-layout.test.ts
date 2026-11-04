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
      inzet_houding: { werkt_mee: true, toelichting: 'Werknemer werkt mee aan het spoor 2-traject.' },
      interventies_motivatie: {
        selected: ['empowerment', 'rouwproces'],
        blocks: {
          empowerment: {
            toelichting: 'Eerste alinea van de empowerment toelichting.\n\nTweede alinea van de empowerment toelichting.',
            standaardtekst: true,
          },
          rouwproces: { toelichting: 'Toelichting bij verlies en acceptatie.', standaardtekst: true },
        },
      },
    },
  });
}

function markup(atom: VGRBodyAtom | undefined): string {
  assert.ok(atom, 'missing atom');
  return renderToStaticMarkup(atom.node as Parameters<typeof renderToStaticMarkup>[0]);
}

describe('fase motivatie layout', () => {
  const atoms = buildVgrBodyAtoms(draft());
  const byId = new Map(atoms.map((a) => [a.id, a]));

  it('keeps the question, Ja/Nee, motivatie lead and checkboxes outside the panels', () => {
    assert.equal(byId.get('ih-q')?.panel, undefined);
    assert.equal(byId.get('ih-jn')?.panel, undefined);
    assert.equal(byId.get('im-h')?.panel, undefined);
    assert.equal(byId.get('im-lead')?.panel, undefined);
    assert.equal(byId.get('im-checks')?.panel, undefined);
    const lead = markup(byId.get('im-lead'));
    assert.match(lead, /Onderstaande interventies zijn ingezet op het vlak van motivatie/);
    assert.match(lead, /text-\[#782A90\]/);
    assert.match(lead, /font-bold/);
  });

  it('puts inzet and algemene toelichting in their own panels', () => {
    assert.equal(byId.get('ih-toel-h')?.panel, 'ih-toel');
    assert.equal(byId.get('ih-toel')?.panel, 'ih-toel');
    assert.match(markup(byId.get('ih-toel-h')), /Toelichting/);
    assert.equal(byId.get('im-alg-h')?.panel, 'im-alg');
    assert.equal(byId.get('im-alg')?.panel, 'im-alg');
    assert.match(markup(byId.get('im-alg-h')), /Algemene toelichting/);
    assert.match(markup(byId.get('im-alg')), /weerbaarheid en veerkracht/);
  });

  it('gives each selected intervention its own panel, with Z marks on the empowerment items', () => {
    for (const id of ['im-empowerment-h', 'im-empowerment-std-0', 'im-empowerment-il', 'im-empowerment-items', 'im-empowerment-toel']) {
      assert.equal(byId.get(id)?.panel, 'im-empowerment', id);
    }
    for (const id of ['im-rouwproces-h', 'im-rouwproces-std-0', 'im-rouwproces-toel']) {
      assert.equal(byId.get(id)?.panel, 'im-rouwproces', id);
    }
    const items = markup(byId.get('im-empowerment-items'));
    assert.match(items, /val-logo\.jpg/);
    assert.match(items, /Zelfbewust wording/);
    assert.doesNotMatch(items, /list-disc/);
    const lead = markup(byId.get('im-empowerment-il'));
    assert.match(lead, /Onderstaande interventies zijn ingezet op het vlak van empowerment/);
    assert.match(lead, /text-\[#782A90\]/);
    assert.doesNotMatch(markup(byId.get('im-empowerment-toel')), /Geef hier een persoonlijke toelichting/);
    assert.equal(byId.get('im-overig-h'), undefined);
    assert.equal(byId.get('im-nvt-h'), undefined);
  });

  it('copies the empowerment panel id when the toelichting splits', () => {
    const atom = byId.get('im-empowerment-toel');
    assert.ok(atom);
    const parts = splitVgrBodyAtom(atom);
    assert.ok(parts);
    assert.equal(parts.length, 2);
    assert.equal(parts[0].panel, 'im-empowerment');
    assert.equal(parts[1].panel, 'im-empowerment');
  });

  it('leaves oriëntatie atoms without a panel', () => {
    assert.equal(byId.get('or-alg')?.panel, undefined);
    assert.equal(byId.get('ko-h')?.panel, undefined);
    assert.equal(byId.get('ko-lead')?.panel, undefined);
    assert.equal(byId.get('sc-h')?.panel, undefined);
  });
});
