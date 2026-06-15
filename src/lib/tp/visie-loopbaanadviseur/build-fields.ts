import {
  buildArtsPhrase,
  isFemaleGender,
  isMaleGender,
  nlDate,
} from '@/lib/tp/format-context';
import {
  AD_FUNCTIES_INTRO,
  EN_SOORTGELIJK,
  FML_FUNCTIES_INTRO_TEMPLATE,
  FUNCTIE_FOOTER,
  FUNCTIES_DELIMITER,
  TOELICHTING_DELIMITER,
  TOELICHTING_MAN,
  TOELICHTING_ONBEKEND,
  TOELICHTING_VROUW,
} from './constants';
import type { VisieLoopbaanadviseurContentResult } from './schema';

export type VisieLoopbaanadviseurBuildContext = {
  details: { gender?: string | null };
  meta: {
    fml_izp_lab_date?: string | null;
    intake_date?: string | null;
    occupational_doctor_org?: string | null;
    advies_ad_passende_arbeid?: string | null;
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

function buildFunctiesIntro(
  ctx: VisieLoopbaanadviseurBuildContext,
  adFunctiesBekend: boolean
): string {
  if (adFunctiesBekend) return AD_FUNCTIES_INTRO;

  const fmlDatum = nlDate(ctx.meta.fml_izp_lab_date) || '[datum FML]';
  const intakeDatum = nlDate(ctx.meta.intake_date) || '[datum intake]';
  const artsPhrase = buildArtsPhrase(ctx.meta.occupational_doctor_org);

  return FML_FUNCTIES_INTRO_TEMPLATE.replace('{fmlDatum}', fmlDatum)
    .replace('{artsPhrase}', artsPhrase)
    .replace('{intakeDatum}', intakeDatum);
}

function formatFunctieBullets(content: VisieLoopbaanadviseurContentResult): string {
  const functies = content.functies.slice(0, 4);
  while (functies.length < 4) {
    functies.push({ naam: EN_SOORTGELIJK, toelichting: '' });
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

export function buildVisieLoopbaanadviseurFields(
  ctx: VisieLoopbaanadviseurBuildContext,
  content: VisieLoopbaanadviseurContentResult
): VisieLoopbaanadviseurFields {
  const toelichting = getToelichtingParagraph(ctx.details.gender);
  const functiesIntro = buildFunctiesIntro(ctx, content.ad_functies_bekend);
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
