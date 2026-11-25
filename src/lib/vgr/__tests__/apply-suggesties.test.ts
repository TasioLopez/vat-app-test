import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyVgrAiSuggesties,
  ensureInterventionSelectedFromPatch,
  mergeVgrBodyPatches,
  parseSelectedInterventiesSuggestie,
  parseVgrRubriekenSuggestie,
  previewVgrDataAfterBodyPatch,
} from '@/lib/vgr/ai/apply-suggesties';
import { ensureVGRShape } from '@/lib/vgr/mapping';

describe('parseVgrRubriekenSuggestie', () => {
  it('keeps only known rubrieken', () => {
    const out = parseVgrRubriekenSuggestie(
      'Persoonlijk functioneren, Werktijden, onzin, Aanpassing aan fysische en/of fysieke omgevingseisen',
    );
    assert.deepEqual(new Set(out), new Set([
      'Persoonlijk functioneren',
      'Werktijden',
      'Aanpassing aan fysische en/of fysieke omgevingseisen',
    ]));
  });
});

describe('applyVgrAiSuggesties', () => {
  it('maps ja/nee, rubrieken, tredes and kansen into a body patch', () => {
    const data = ensureVGRShape({});
    const patch = mergeVgrBodyPatches(
      applyVgrAiSuggesties(data, 'benutbare_mogelijkheden', { heeft_benutbare_mogelijkheden: 'ja' }),
      applyVgrAiSuggesties(data, 'praktische_belemmeringen', { aanwezig: 'nee' }),
      applyVgrAiSuggesties(data, 'inzet_houding', { werkt_mee: 'ja' }),
      applyVgrAiSuggesties(data, 'belastbaarheidsprofiel', {
        rubrieken: 'Persoonlijk functioneren, Werktijden',
      }),
      applyVgrAiSuggesties(data, 'pow', { huidige_trede: '5', doel_trede: 'onbekend' }),
      applyVgrAiSuggesties(data, 'visie_plaatsbaarheid', { kansen: 'goed' }),
    );
    assert.equal(patch.benutbare_mogelijkheden?.heeft, true);
    assert.equal(patch.praktische_belemmeringen?.aanwezig, false);
    assert.equal(patch.inzet_houding?.werkt_mee, true);
    assert.deepEqual(patch.belastbaarheidsprofiel?.rubrieken, ['Persoonlijk functioneren', 'Werktijden']);
    assert.equal(patch.pow?.huidige_trede, 5);
    assert.equal(patch.pow?.doel_onbekend, true);
    assert.equal(patch.pow?.confirmed, false);
    assert.equal(patch.visie_plaatsbaarheid?.kansen, 'goed');
  });

  it('applies selected_interventies and unions toelichting block ids', () => {
    const data = ensureVGRShape({});
    assert.deepEqual(parseSelectedInterventiesSuggestie('empowerment, rouwproces, fake'), [
      'empowerment',
      'rouwproces',
    ]);
    const fieldPatch = {
      interventies_motivatie: {
        blocks: {
          empowerment: { toelichting: 'Gedaan.', items: [], standaardtekst: true },
        },
      },
    };
    const after = previewVgrDataAfterBodyPatch(data, fieldPatch);
    const suggest = applyVgrAiSuggesties(after, 'interventies_motivatie', {
      selected_interventies: 'empowerment, rouwproces',
    });
    const selected = ensureInterventionSelectedFromPatch(
      'interventies_motivatie',
      after,
      fieldPatch,
      { selected_interventies: 'empowerment, rouwproces' },
    );
    const merged = mergeVgrBodyPatches(fieldPatch, suggest, selected);
    assert.ok(merged.interventies_motivatie?.selected?.includes('empowerment'));
    assert.ok(merged.interventies_motivatie?.selected?.includes('rouwproces'));
    assert.equal(merged.interventies_motivatie?.blocks?.empowerment?.toelichting, 'Gedaan.');
  });

  it('updates bijstelling rubrieken on the previewed revision', () => {
    const data = ensureVGRShape({
      body: {
        bijstellingen_belastbaarheid: {
          aanwezig: true,
          revisions: [
            {
              id: 'r1',
              date: '2026-09-22',
              auteur: 'Arts',
              kind: 'izp',
              rubrieken: [],
              toelichting: 'Toegenomen.',
            },
          ],
        },
      },
    });
    const fieldPatch = {
      bijstellingen_belastbaarheid: {
        revisions: [
          {
            id: 'r1',
            date: '2026-09-22',
            auteur: 'Arts',
            kind: 'izp' as const,
            rubrieken: [] as [],
            toelichting: 'Toegenomen.',
          },
        ],
      },
    };
    const after = previewVgrDataAfterBodyPatch(data, fieldPatch);
    const suggest = applyVgrAiSuggesties(after, 'bijstellingen_belastbaarheid', {
      aanwezig: 'ja',
      rubrieken: 'Persoonlijk functioneren',
    });
    assert.equal(suggest.bijstellingen_belastbaarheid?.aanwezig, true);
    assert.deepEqual(suggest.bijstellingen_belastbaarheid?.revisions?.[0]?.rubrieken, [
      'Persoonlijk functioneren',
    ]);
  });
});
