import { isFemaleGender, isMaleGender } from '@/lib/tp/format-context';
import {
  buildFunctiesFromIntakeCategories,
  type IntakeSectie7FunctieCategorie,
} from '@/lib/tp/intake-sectie7';
import {
  AD_FUNCTIES_INTRO,
  EN_SOORTGELIJK,
  FUNCTIE_FOOTER,
  FUNCTIES_DELIMITER,
  NO_AD_BELASTBAARHEID_INTRO,
  NO_AD_NO_BELASTBAARHEID_INTRO,
  TOELICHTING_DELIMITER,
  TOELICHTING_MAN,
  TOELICHTING_ONBEKEND,
  TOELICHTING_VROUW,
  type DocumentScenario,
} from './constants';
import type { VisieLoopbaanadviseurContentResult } from './schema';

export type VisieLoopbaanadviseurBuildContext = {
  details: { gender?: string | null };
  meta: {
    fml_izp_lab_date?: string | null;
    intake_date?: string | null;
    occupational_doctor_org?: string | null;
    advies_ad_passende_arbeid?: string | null;
    zoekprofiel?: string | null;
    persoonlijk_profiel?: string | null;
    has_ad_report?: boolean | null;
  };
};

export type VisieLoopbaanadviseurFields = {
  visie_loopbaanadviseur: string;
};

export function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function getToelichtingParagraph(gender?: string | null): string {
  if (isMaleGender(gender)) return TOELICHTING_MAN;
  if (isFemaleGender(gender)) return TOELICHTING_VROUW;
  return TOELICHTING_ONBEKEND;
}

export function buildFunctiesIntro(scenario: DocumentScenario): string {
  switch (scenario) {
    case 'ad':
      return AD_FUNCTIES_INTRO;
    case 'belastbaarheid_only':
      return NO_AD_BELASTBAARHEID_INTRO;
    case 'intake_only':
      return NO_AD_NO_BELASTBAARHEID_INTRO;
  }
}

function countSentences(text: string): number {
  if (!text.trim()) return 0;
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
}

function validateFuncties(content: VisieLoopbaanadviseurContentResult): void {
  const functies = content.functies;
  if (functies.length !== 4) {
    console.warn(`⚠️ Visie loopbaanadviseur: verwacht 4 functies, gevonden ${functies.length}`);
  }

  const fourth = functies[3]?.naam?.trim().toLowerCase();
  if (fourth && fourth !== EN_SOORTGELIJK.toLowerCase()) {
    console.warn('⚠️ Visie loopbaanadviseur: vierde functie moet "En soortgelijk" zijn');
  }

  const names = functies.map((f) => f.naam.trim().toLowerCase()).filter(Boolean);
  const unique = new Set(names);
  if (unique.size !== names.length) {
    console.warn('⚠️ Visie loopbaanadviseur: dubbele functienamen gevonden');
  }

  for (const f of functies.slice(0, 3)) {
    if (countSentences(f.toelichting) > 1) {
      console.warn(`⚠️ Visie loopbaanadviseur: toelichting >1 zin voor "${f.naam}"`);
    }
  }
}

function formatFunctieBullets(content: VisieLoopbaanadviseurContentResult): string {
  const functies = content.functies.slice(0, 4);
  while (functies.length < 4) {
    functies.push({ naam: EN_SOORTGELIJK, toelichting: '' });
  }

  if (functies[3]) {
    functies[3] = { naam: EN_SOORTGELIJK, toelichting: '' };
  }

  return functies
    .map((f) => {
      const naam = f.naam.trim();
      const toel = stripCitations(f.toelichting.trim());
      if (naam.toLowerCase() === EN_SOORTGELIJK.toLowerCase() || !toel) {
        return `• ${naam || EN_SOORTGELIJK}`;
      }
      return `• ${naam} – ${toel}`;
    })
    .join('\n');
}

/** @deprecated V10 uses AI-selected functies; kept for legacy/tests only. */
export function buildVisieLoopbaanadviseurContentFromIntake(
  categories: IntakeSectie7FunctieCategorie[]
): VisieLoopbaanadviseurContentResult {
  return {
    functies: buildFunctiesFromIntakeCategories(categories),
  };
}

export type ParsedVisieLoopbaanadviseur = {
  toelichting: string;
  functiesIntro: string;
  functieBullets: string;
  footer: string;
};

function splitFunctiesBody(body: string): { intro: string; bullets: string; footer: string } {
  const trimmed = body.trim();
  if (!trimmed) return { intro: '', bullets: '', footer: '' };

  let footerIdx = trimmed.indexOf(FUNCTIE_FOOTER);
  if (footerIdx === -1) {
    const footerMarker = FUNCTIE_FOOTER.replace(/^\*/, '').slice(0, 40);
    footerIdx = trimmed.indexOf(footerMarker);
  }
  if (footerIdx === -1) {
    const lines = trimmed.split('\n');
    const bulletStart = lines.findIndex((l) => /^[•☑✓\-]/.test(l.trim()));
    if (bulletStart <= 0) return { intro: trimmed, bullets: '', footer: '' };
    return {
      intro: lines.slice(0, bulletStart).join('\n').trim(),
      bullets: lines.slice(bulletStart).join('\n').trim(),
      footer: '',
    };
  }

  const beforeFooter = trimmed.slice(0, footerIdx).trim();
  const footer = trimmed.slice(footerIdx).trim();
  const lines = beforeFooter.split('\n');
  const bulletStart = lines.findIndex((l) => /^[•☑✓\-]/.test(l.trim()));
  if (bulletStart <= 0) {
    return { intro: beforeFooter, bullets: '', footer };
  }
  return {
    intro: lines.slice(0, bulletStart).join('\n').trim(),
    bullets: lines.slice(bulletStart).join('\n').trim(),
    footer,
  };
}

export function parseVisieLoopbaanadviseur(raw: string): ParsedVisieLoopbaanadviseur {
  const text = String(raw ?? '').trim();
  if (!text) {
    return { toelichting: '', functiesIntro: '', functieBullets: '', footer: FUNCTIE_FOOTER };
  }

  if (!text.includes(TOELICHTING_DELIMITER)) {
    return { toelichting: text, functiesIntro: '', functieBullets: '', footer: FUNCTIE_FOOTER };
  }

  const afterToelichting = text.split(TOELICHTING_DELIMITER)[1] ?? '';
  const [toelichtingBody, functiesBody = ''] = afterToelichting.split(FUNCTIES_DELIMITER);
  const { intro, bullets, footer } = splitFunctiesBody(functiesBody);

  return {
    toelichting: toelichtingBody.trim(),
    functiesIntro: intro,
    functieBullets: bullets,
    footer: footer || FUNCTIE_FOOTER,
  };
}

export function buildVisieLoopbaanadviseurBlock(parsed: ParsedVisieLoopbaanadviseur): string {
  const toelichting = parsed.toelichting.trim();
  const functiesIntro = parsed.functiesIntro.trim();
  const functieBullets = parsed.functieBullets.trim();
  const footer = (parsed.footer || FUNCTIE_FOOTER).trim();

  if (!toelichting && !functiesIntro && !functieBullets) return '';

  if (!functiesIntro && !functieBullets) {
    return [TOELICHTING_DELIMITER, toelichting].join('\n\n');
  }

  return [
    TOELICHTING_DELIMITER,
    toelichting,
    FUNCTIES_DELIMITER,
    functiesIntro,
    functieBullets,
    footer,
  ].join('\n\n');
}

export function buildVisieLoopbaanadviseurFields(
  ctx: VisieLoopbaanadviseurBuildContext,
  content: VisieLoopbaanadviseurContentResult,
  scenario: DocumentScenario
): VisieLoopbaanadviseurFields {
  validateFuncties(content);

  const toelichting = getToelichtingParagraph(ctx.details.gender);
  const functiesIntro = buildFunctiesIntro(scenario);
  const bullets = formatFunctieBullets(content);

  const assembled = [
    TOELICHTING_DELIMITER,
    toelichting,
    FUNCTIES_DELIMITER,
    functiesIntro,
    bullets,
    FUNCTIE_FOOTER,
  ].join('\n\n');

  return { visie_loopbaanadviseur: assembled };
}
