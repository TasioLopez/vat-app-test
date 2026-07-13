import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdSubBlock,
  buildInleidingFields,
  type InleidingBuildContext,
} from '../build-fields';
import { AD_INTRO_SUFFIX, INLEIDING_GEEN_AD, isAdSubBlock } from '../constants';
import type { InleidingContentResult } from '../schema';

const baseCtx: InleidingBuildContext = {
  employee: { first_name: 'Kim', last_name: 'Baaijens' },
  details: {
    gender: 'Vrouw',
    current_job: 'Verpleegkundige',
    contract_hours: '32',
    date_of_birth: '1985-03-15',
  },
  meta: {
    intake_date: '2026-01-15',
    first_sick_day: '2025-06-01',
    has_ad_report: true,
    ad_report_date: '2026-01-10',
    occupational_doctor_name: 'dhr. R. Teegelaar',
    advies_ad_passende_arbeid: null,
  },
  client: { name: 'Cordaan' },
  referent: {
    id: 'ref-1',
    client_id: 'c-1',
    first_name: 'Jan',
    last_name: 'Jansen',
    phone: null,
    email: null,
    referent_function: 'HR adviseur',
    gender: 'Man',
    display_order: null,
    is_default: true,
    created_at: null,
  },
};

const baseContent: InleidingContentResult = {
  functieomschrijving: 'Zorg verlenen aan cliënten in de thuiszorg.',
  medische_begeleiding: 'actief',
  reintegreert_spoor1: false,
  reintegratie_uren: null,
  reintegratie_werk_type: null,
  werknemer_doel_toelichting: null,
  ad_quote: 'Formeel is werknemer wel langer dan een jaar ziek.',
  extra_aanmelder: null,
};

describe('buildInleidingFields', () => {
  it('builds six main paragraphs plus inleiding_sub when AD present', () => {
    const { inleiding, inleiding_sub } = buildInleidingFields(baseCtx, baseContent);
    const parts = inleiding.split('\n\n');
    assert.equal(parts.length, 6);
    assert.match(parts[0], /mevrouw Baaijens, hierna werknemer te noemen/);
    assert.match(parts[1], /medische beperkingen/);
    assert.match(parts[1], /32 uur per week/);
    assert.match(parts[2], /^\*\*Functieomschrijving\*\*\n/);
    assert.match(parts[3], /namens Cordaan/);
    assert.match(parts[4], /Gezien de wetgeving verwerking persoonsgegevens/);
    assert.match(parts[4], /is werknemer onder behandeling/);
    assert.match(parts[5], /re-integreert werknemer niet in spoor 1/);
    assert.match(parts[5], /ValentineZ heeft uitgelegd/);
    assert.ok(inleiding_sub.includes(AD_INTRO_SUFFIX));
    assert.ok(inleiding_sub.includes('dhr. R. Teegelaar'));
    assert.ok(inleiding_sub.includes(baseContent.ad_quote!));
  });

  it('appends bold no-AD paragraph and empty sub when no AD report', () => {
    const ctx = {
      ...baseCtx,
      meta: { ...baseCtx.meta, has_ad_report: false },
    };
    const content = { ...baseContent, ad_quote: null };
    const { inleiding, inleiding_sub } = buildInleidingFields(ctx, content);
    assert.match(inleiding, new RegExp(`\\*\\*${INLEIDING_GEEN_AD.replace(/\./g, '\\.')}\\*\\*`));
    assert.equal(inleiding_sub, '');
  });

  it('includes concept AD quote without geen-AD paragraph when ad_report_concept is true', () => {
    const ctx = {
      ...baseCtx,
      meta: {
        ...baseCtx.meta,
        has_ad_report: false,
        ad_report_concept: true,
      },
    };
    const { inleiding, inleiding_sub } = buildInleidingFields(ctx, baseContent);
    assert.doesNotMatch(inleiding, new RegExp(INLEIDING_GEEN_AD.replace(/\./g, '\\.')));
    assert.match(inleiding_sub, /concept arbeidsdeskundig rapport/);
    assert.ok(inleiding_sub.includes(baseContent.ad_quote!));
  });

  it('uses male pronouns for man gender', () => {
    const ctx: InleidingBuildContext = {
      ...baseCtx,
      details: { ...baseCtx.details, gender: 'Man' },
    };
    const content = { ...baseContent, medische_begeleiding: 'afgerond' as const };
    const { inleiding } = buildInleidingFields(ctx, content);
    assert.match(inleiding, /de heer Baaijens/);
    assert.match(inleiding, /-jarige man/);
    assert.match(inleiding, /zijn functie/);
    assert.match(inleiding, /was werknemer onder behandeling/);
  });

  it('omits treatment sentence for geen medische_begeleiding', () => {
    const content = { ...baseContent, medische_begeleiding: 'geen' as const };
    const { inleiding } = buildInleidingFields(baseCtx, content);
    const medPara = inleiding.split('\n\n')[4];
    assert.match(medPara, /Gezien de wetgeving verwerking persoonsgegevens/);
    assert.doesNotMatch(medPara, /zorgcircuit/);
  });

  it('includes spoor 1 re-integration details when active', () => {
    const content = {
      ...baseContent,
      reintegreert_spoor1: true,
      reintegratie_uren: '8',
      reintegratie_werk_type: 'deels aangepast werk' as const,
    };
    const { inleiding } = buildInleidingFields(baseCtx, content);
    assert.match(inleiding, /8 uur per week in deels aangepast werk/);
  });

  it('uses extra aanmelder sentence when provided', () => {
    const content = {
      ...baseContent,
      extra_aanmelder: {
        functie: 'Casemanager',
        naam: 'P. de Vries',
        organisatie: 'UWV',
        gender: null,
      },
    };
    const { inleiding } = buildInleidingFields(baseCtx, content);
    assert.match(inleiding, /door P\. de Vries, Casemanager bij UWV In opdracht van: meneer J\. Jansen/);
  });

  it('does not apply referent gender title to extra aanmelder', () => {
    const ctx: InleidingBuildContext = {
      ...baseCtx,
      referent: {
        ...baseCtx.referent!,
        first_name: 'Ellen',
        last_name: 'Bosma',
        referent_function: 'Casemanager',
        gender: 'Vrouw',
      },
    };
    const content = {
      ...baseContent,
      extra_aanmelder: {
        functie: 'Casemanager',
        naam: 'Hans Nooijen',
        organisatie: 'Gom Schoonhouden B.V.',
        gender: null,
      },
    };
    const { inleiding } = buildInleidingFields(ctx, content);
    assert.match(inleiding, /door Hans Nooijen, Casemanager bij Gom Schoonhouden B\.V\./);
    assert.doesNotMatch(inleiding, /door mevrouw Hans Nooijen/);
    assert.match(inleiding, /In opdracht van: mevrouw E\. Bosma, Casemanager Cordaan/);
  });

  it('uses extra aanmelder gender when provided', () => {
    const ctx: InleidingBuildContext = {
      ...baseCtx,
      referent: {
        ...baseCtx.referent!,
        gender: 'Vrouw',
      },
    };
    const content = {
      ...baseContent,
      extra_aanmelder: {
        functie: 'Casemanager',
        naam: 'Hans Nooijen',
        organisatie: 'Gom Schoonhouden B.V.',
        gender: 'Man' as const,
      },
    };
    const { inleiding } = buildInleidingFields(ctx, content);
    assert.match(inleiding, /door meneer Hans Nooijen, Casemanager bij Gom Schoonhouden B\.V\./);
    assert.match(inleiding, /In opdracht van: mevrouw J\. Jansen/);
  });

  it('strips honorific prefix accidentally included in extra aanmelder naam', () => {
    const content = {
      ...baseContent,
      extra_aanmelder: {
        functie: 'Casemanager',
        naam: 'mevrouw Hans Nooijen',
        organisatie: 'Gom Schoonhouden B.V.',
        gender: 'Man' as const,
      },
    };
    const { inleiding } = buildInleidingFields(baseCtx, content);
    assert.match(inleiding, /door meneer Hans Nooijen, Casemanager bij Gom Schoonhouden B\.V\./);
    assert.doesNotMatch(inleiding, /meneer mevrouw/);
  });

  it('handles numeric contract_hours from database', () => {
    const ctx: InleidingBuildContext = {
      ...baseCtx,
      details: { ...baseCtx.details, contract_hours: 32 },
    };
    const { inleiding } = buildInleidingFields(ctx, baseContent);
    assert.match(inleiding, /urenomvang van 32 uur per week/);
  });

  it('falls back to advies_ad_passende_arbeid for AD quote when model quote empty', () => {
    const ctx = {
      ...baseCtx,
      meta: {
        ...baseCtx.meta,
        advies_ad_passende_arbeid: 'Advies uit meta veld.',
      },
    };
    const content = { ...baseContent, ad_quote: null };
    const { inleiding_sub } = buildInleidingFields(ctx, content);
    assert.match(inleiding_sub, /Advies uit meta veld/);
  });
});

describe('buildAdSubBlock', () => {
  it('formats AD intro with delimiter suffix', () => {
    const block = buildAdSubBlock('dhr. X', '15 januari 2026', 'Citaat tekst.');
    assert.match(block, /op 15 januari 2026 staat het volgende advies/);
    assert.ok(block.endsWith('Citaat tekst.'));
  });
});

describe('isAdSubBlock', () => {
  it('detects V2 AD intro suffix', () => {
    assert.equal(isAdSubBlock(`Intro ${AD_INTRO_SUFFIX} quote`), true);
  });

  it('detects legacy AD intro suffix', () => {
    assert.equal(isAdSubBlock('Intro staat het volgende: quote'), true);
  });

  it('returns false for unrelated text', () => {
    assert.equal(isAdSubBlock(INLEIDING_GEEN_AD), false);
  });
});
