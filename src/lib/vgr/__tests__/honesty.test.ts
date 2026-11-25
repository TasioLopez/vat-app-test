/**
 * Phase 1 honesty regressions mapped to pack acceptance T01 / T05 / T06 / T13 (+ G4).
 * Synthetic fixtures only — no filled client examples.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVgrApplyBodyPatch,
  sanitizeVgrQuotesInBodyPatch,
} from '@/lib/vgr/ai/apply-suggesties';
import {
  detectInventedTestsOrApplications,
  detectOverstatedActivityStatus,
  isAdLeadSource,
  looksInventedQuote,
  sanitizeQuoteForApply,
} from '@/lib/vgr/ai/quote-honesty';
import { VGR_AI_SECTIONS, VGR_MEDICAL_LEAD_DOCS, sanitizeGeneratedText } from '@/lib/vgr/ai/sections';
import { VGR_APPROVED_RULES_VERSION, VGR_STYLE_SYSTEM_PROMPT } from '@/lib/vgr/ai/style-prompt';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { computeVgrPreflight, writableVgrAiSectionIds } from '@/lib/vgr/preflight';

describe('G4 AD ≠ benutbare mogelijkheden', () => {
  it('excludes AD from medical lead preferred docs', () => {
    assert.deepEqual([...VGR_MEDICAL_LEAD_DOCS], ['spreek_reportage', 'fml_izp']);
    assert.deepEqual(VGR_AI_SECTIONS.benutbare_mogelijkheden.preferredDocTypes, ['spreek_reportage', 'fml_izp']);
    assert.match(VGR_AI_SECTIONS.benutbare_mogelijkheden.instructions, /AD-rapport is GEEN/i);
    assert.doesNotMatch(VGR_AI_SECTIONS.benutbare_mogelijkheden.instructions, /AD-rapport\. Geef per citaat/i);
  });

  it('preflight blocks BM when only AD is selected', () => {
    const data = ensureVGRShape({
      vgr_meta: { period_start: '2026-09-01', period_end: '2026-10-28', report_date: '2026-10-28' },
    });
    const out = computeVgrPreflight(data, ['ad_rapportage']);
    const bm = out.modules.find((m) => m.id === 'benutbare_mogelijkheden');
    assert.equal(bm?.writable, false);
    assert.equal(bm?.status, 'ADDITIONAL_INFORMATION_NEEDED');
    assert.match(bm?.question || '', /bedrijfsarts/i);
    assert.ok(!writableVgrAiSectionIds(out).includes('benutbare_mogelijkheden'));
  });

  it('refuses AD-as-lead quotes on apply', () => {
    const { quote, refused, reason } = sanitizeQuoteForApply(
      {
        citaat: 'Werknemer kan 4 uur per dag.',
        bron_naam: 'A. Deskundige',
        bron_datum: '2026-09-01',
        bron_type: 'AD-rapport',
      },
      { requireMedicalLead: true },
    );
    assert.equal(refused, true);
    assert.equal(reason, 'ad_geen_medische_bron_voor_benutbare_mogelijkheden');
    assert.equal(quote.citaat, '');
    assert.equal(isAdLeadSource('arbeidsdeskundige rapportage'), true);
  });
});

describe('G10 SYSTEM_VGR_CORE style prompt', () => {
  it('embeds status vocabulary and medical/AD separation', () => {
    assert.match(VGR_STYLE_SYSTEM_PROMPT, /opgesteld/);
    assert.match(VGR_STYLE_SYSTEM_PROMPT, /verzonden/);
    assert.match(VGR_STYLE_SYSTEM_PROMPT, /Benutbare mogelijkheden/);
    assert.match(VGR_STYLE_SYSTEM_PROMPT, /AD-rapport is daarvoor NIET/i);
    assert.match(VGR_STYLE_SYSTEM_PROMPT, /conceptvoorstel/);
    assert.ok(VGR_APPROVED_RULES_VERSION.startsWith('vgr-core-'));
  });
});

describe('T05 exact quote preservation', () => {
  it('keeps typos and odd punctuation; only strips template placeholders', () => {
    const raw = 'Herstel is "matig" — zie FML [20 maart 2026]; werkuurm: 4u!!';
    assert.equal(sanitizeGeneratedText(raw), raw);
    assert.equal(
      sanitizeGeneratedText('Citaat [naam] van de arts over herstel.'),
      'Citaat van de arts over herstel.',
    );
    const kept = sanitizeQuoteForApply({
      citaat: 'Belastbaarhijd is toegenomen!!!',
      bron_naam: 'S. de Beaufort',
      bron_datum: '2026-09-22',
      bron_type: 'de terugkoppeling van het spreekuur',
    });
    assert.equal(kept.refused, false);
    assert.equal(kept.quote.citaat, 'Belastbaarhijd is toegenomen!!!');
  });
});

describe('T01 / T06 / T13 activity honesty', () => {
  it('T01: flags invented tests and applications in prose', () => {
    assert.deepEqual(
      detectInventedTestsOrApplications(
        'Werknemer heeft een persoonlijkheidstest afgenomen en gesolliciteerd bij ACME.',
        { allowTests: false, allowApps: false },
      ),
      ['fictieve_test', 'fictieve_sollicitatie'],
    );
    assert.deepEqual(
      detectInventedTestsOrApplications('Werknemer werkt aan CV-opbouw.', {
        allowTests: false,
        allowApps: false,
      }),
      [],
    );
  });

  it('T06: motivatiebrief verzonden without proof is overstated', () => {
    const issues = detectOverstatedActivityStatus(
      'De motivatiebrief is verzonden naar de werkgever.',
    );
    assert.ok(issues.includes('motivatiebrief_als_verzonden_zonder_bewijs'));
    assert.deepEqual(
      detectOverstatedActivityStatus(
        'De motivatiebrief is opgesteld; verzending volgt na goedkeuring.',
      ),
      [],
    );
  });

  it('T13: planned marked as executed is overstated', () => {
    const issues = detectOverstatedActivityStatus(
      'De sollicitatietraining is uitgevoerd zoals gepland voor de volgende fase.',
    );
    assert.ok(issues.includes('gepland_als_uitgevoerd'));
  });
});

describe('G6 lite / G7 apply path', () => {
  it('surfaces one question per gap and skips non-writable in writable list', () => {
    const data = ensureVGRShape({
      vgr_meta: { period_start: '2026-09-01', period_end: '2026-10-28', report_date: '2026-10-28' },
      body: { interventies_activatie: { selected: ['wekelijks_solliciteren'] } },
      applications: [],
    });
    const out = computeVgrPreflight(data, ['ad_rapportage']);
    assert.ok(out.questions.length >= 1);
    assert.ok(out.questions.every((q) => typeof q === 'string' && q.length > 8));
    const apps = out.modules.find((m) => m.id === 'applications');
    assert.equal(apps?.question?.includes('sollicitat'), true);
  });

  it('refuses empty and invented quotes on sanitize apply', () => {
    assert.equal(looksInventedQuote('voorbeeldcitaat'), true);
    assert.equal(looksInventedQuote('Werknemer kan licht tillen.'), false);

    const empty = sanitizeQuoteForApply({
      citaat: '',
      bron_naam: 'Arts',
      bron_datum: '2026-01-01',
      bron_type: 'spreekuur',
    });
    assert.equal(empty.refused, true);
    assert.equal(empty.reason, 'leeg_citaat');

    const data = ensureVGRShape({});
    const { patch, refusedQuotes } = buildVgrApplyBodyPatch(data, 'benutbare_mogelijkheden', {
      benutbare_mogelijkheden: {
        prognose: {
          citaat: 'lorem ipsum',
          bron_naam: 'X',
          bron_datum: '2026-01-01',
          bron_type: 'spreekuur',
        },
        conclusie: {
          citaat: 'Echte quote van de arts.',
          bron_naam: 'S. de Beaufort',
          bron_datum: '2026-09-22',
          bron_type: 'de terugkoppeling van het spreekuur',
        },
        advies: {
          citaat: 'Volgens AD mag werknemer alles.',
          bron_naam: 'AD Jansen',
          bron_datum: '2026-08-01',
          bron_type: 'AD-rapport',
        },
      },
      __suggesties: {},
    });
    assert.equal(patch.benutbare_mogelijkheden?.prognose?.citaat, '');
    assert.equal(patch.benutbare_mogelijkheden?.conclusie?.citaat, 'Echte quote van de arts.');
    assert.equal(patch.benutbare_mogelijkheden?.advies?.citaat, '');
    assert.ok(refusedQuotes.some((r) => /prognose/.test(r)));
    assert.ok(refusedQuotes.some((r) => /advies/.test(r)));
  });

  it('sanitizeVgrQuotesInBodyPatch is idempotent for clean medical quotes', () => {
    const { patch, refused } = sanitizeVgrQuotesInBodyPatch('benutbare_mogelijkheden', {
      benutbare_mogelijkheden: {
        prognose: {
          citaat: 'Herstel op korte termijn.',
          bron_naam: 'S. de Beaufort',
          bron_datum: '2026-09-22',
          bron_type: 'spreekuur',
        },
      },
    });
    assert.equal(refused.length, 0);
    assert.equal(patch.benutbare_mogelijkheden?.prognose?.citaat, 'Herstel op korte termijn.');
  });
});

describe('report_type scaffold (WIA room)', () => {
  it('defaults VGR1 / VGR_FOLLOWUP from version; preserves WIA_FINAL if set', () => {
    assert.equal(ensureVGRShape({}).vgr_meta.report_type, 'VGR1');
    assert.equal(ensureVGRShape({ vgr_meta: { version: 2 } }).vgr_meta.report_type, 'VGR_FOLLOWUP');
    assert.equal(
      ensureVGRShape({ vgr_meta: { version: 1, report_type: 'WIA_FINAL' } }).vgr_meta.report_type,
      'WIA_FINAL',
    );
  });
});
