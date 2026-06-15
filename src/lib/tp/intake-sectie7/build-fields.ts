import { EN_SOORTGELIJK } from './constants';
import type { IntakeSectie7Content, IntakeSectie7FunctieCategorie } from './schema';

export function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function sanitizeIntakeSectie7Content(content: IntakeSectie7Content): IntakeSectie7Content {
  return {
    ad_auteur: content.ad_auteur ? stripCitations(content.ad_auteur) : null,
    ad_datum_iso: content.ad_datum_iso,
    quote_advies_spoor2: content.quote_advies_spoor2
      ? stripCitations(content.quote_advies_spoor2)
      : null,
    functie_categorien: content.functie_categorien.map((c) => ({
      naam: stripCitations(c.naam),
      toelichting: stripCitations(c.toelichting),
    })),
  };
}

/** Pad intake categories to exactly 4 LA functie entries (verbatim, then En soortgelijk). */
export function buildFunctiesFromIntakeCategories(
  categories: IntakeSectie7FunctieCategorie[]
): { naam: string; toelichting: string }[] {
  const functies = categories.slice(0, 4).map((c) => ({
    naam: c.naam.trim(),
    toelichting: c.toelichting.trim(),
  }));

  while (functies.length < 4) {
    functies.push({ naam: EN_SOORTGELIJK, toelichting: '' });
  }

  return functies;
}

export function hasIntakeAdviesQuote(content: IntakeSectie7Content): boolean {
  return Boolean(content.quote_advies_spoor2?.trim());
}

export function hasIntakeFunctieCategories(content: IntakeSectie7Content): boolean {
  return content.functie_categorien.some((c) => c.naam.trim());
}
