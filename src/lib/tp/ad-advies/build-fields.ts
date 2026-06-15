import { nlDate } from '@/lib/tp/format-context';
import { ADVIES_DELIMITER, ADVIES_INTRO_SUFFIX } from './constants';
import type { AdAdviesContentResult } from './schema';

export type AdAdviesBuildContext = {
  meta: {
    ad_report_date?: string | null;
    has_ad_report?: boolean | null;
    occupational_doctor_name?: string | null;
  };
};

export type AdAdviesFields = {
  advies_ad_passende_arbeid: string;
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

function resolveAuteur(content: AdAdviesContentResult, ctx: AdAdviesBuildContext): string {
  return (
    content.ad_auteur?.trim() ||
    ctx.meta.occupational_doctor_name?.trim() ||
    '[naam arbeidsdeskundige]'
  );
}

function resolveDatum(content: AdAdviesContentResult, ctx: AdAdviesBuildContext): string {
  const fromContent = nlDate(content.ad_datum_iso);
  if (fromContent) return fromContent;
  const fromMeta = nlDate(ctx.meta.ad_report_date);
  if (fromMeta) return fromMeta;
  return '[datum AD-rapport]';
}

export function buildAdAdviesIntro(
  auteur: string,
  datum: string
): string {
  return `In het arbeidsdeskundigrapport, opgesteld door ${auteur}, op ${datum} ${ADVIES_INTRO_SUFFIX}`;
}

export function buildAdAdviesFields(
  ctx: AdAdviesBuildContext,
  content: AdAdviesContentResult
): AdAdviesFields {
  const auteur = resolveAuteur(content, ctx);
  const datum = resolveDatum(content, ctx);
  const intro = buildAdAdviesIntro(auteur, datum);
  const citaat = content.advies_citaat ? stripCitations(content.advies_citaat) : '';

  const parts = [intro];
  if (citaat) {
    parts.push(`${ADVIES_DELIMITER}\n${citaat}`);
  }

  return { advies_ad_passende_arbeid: parts.join('\n\n') };
}

export type ParsedAdAdvies = {
  intro: string;
  citaat: string;
};

export function parseAdAdvies(raw: string): ParsedAdAdvies {
  const text = String(raw || '').trim();
  if (!text) return { intro: '', citaat: '' };

  if (text.includes(ADVIES_DELIMITER)) {
    const [intro, citaat] = text.split(ADVIES_DELIMITER);
    return { intro: intro.trim(), citaat: (citaat ?? '').trim() };
  }

  return { intro: text, citaat: '' };
}

export function buildAdAdviesBlock(intro: string, citaat: string): string {
  const introTrim = intro.trim();
  const citaatTrim = citaat.trim();
  if (!citaatTrim) return introTrim;
  if (!introTrim) return `${ADVIES_DELIMITER}\n${citaatTrim}`;
  return `${introTrim}\n\n${ADVIES_DELIMITER}\n${citaatTrim}`;
}
