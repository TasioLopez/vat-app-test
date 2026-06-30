import {
  FORBIDDEN_TERMS,
  MAX_WORDS_TOTAL,
  MIN_WORDS_TOTAL,
  OPENING_PATTERN,
  PARA1_CLOSING_TEMPLATES,
  SECTION_HEADING_PATTERN,
  type BelastbaarheidsdocumentType,
} from './constants';
import type { ZoekprofielContentResult } from './schema';

export type ZoekprofielBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  meta: {
    fml_izp_lab_date_voluit?: string | null;
    /** When false, skip FML/IZP/LAB closing (AD/intake-only generation). Defaults to true. */
    has_belastbaarheids_doc?: boolean;
  };
};

export type ZoekprofielFields = {
  zoekprofiel: string;
};

export function nlDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function sanitizeParagraph(text: string): string {
  return stripCitations(text).replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function stripSectionHeading(text: string): string {
  return text.replace(SECTION_HEADING_PATTERN, '').trim();
}

export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function hasV2OpeningSentence(text: string): boolean {
  return OPENING_PATTERN.test(text.trim());
}

export function resolveBelastbaarheidsdatum(
  ctx: ZoekprofielBuildContext,
  content: ZoekprofielContentResult
): string {
  return (
    (ctx.meta.fml_izp_lab_date_voluit || '').trim() ||
    (content.belastbaarheidsdocument_datum_voluit || '').trim()
  );
}

export function buildPara1Closing(
  type: BelastbaarheidsdocumentType,
  datumVoluit: string
): string {
  const template = PARA1_CLOSING_TEMPLATES[type];
  if (!datumVoluit) {
    console.warn('⚠️ Zoekprofiel: belastbaarheidsdocument datum ontbreekt voor alinea 1 closing');
    return template.replace(' van [datum]', '').replace('[datum]', '').trim();
  }
  return template.replace('[datum]', datumVoluit);
}

function validateZoekprofielOutput(zoekprofiel: string, alinea1Kern: string): void {
  const wordCount = countWords(zoekprofiel);
  if (wordCount < MIN_WORDS_TOTAL || wordCount > MAX_WORDS_TOTAL) {
    console.warn(
      `⚠️ Zoekprofiel: woordenaantal ${wordCount} buiten bereik ${MIN_WORDS_TOTAL}–${MAX_WORDS_TOTAL}`
    );
  }

  if (!hasV2OpeningSentence(alinea1Kern)) {
    console.warn('⚠️ Zoekprofiel: alinea_1_kern missing mandatory V2 opening sentence');
  }

  const paragraphCount = zoekprofiel.split(/\n\n+/).filter((p) => p.trim()).length;
  if (paragraphCount !== 2) {
    console.warn(`⚠️ Zoekprofiel: verwacht 2 alinea's, gevonden ${paragraphCount}`);
  }

  const lower = zoekprofiel.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term)) {
      console.warn(`⚠️ Zoekprofiel: verboden term gevonden: "${term}"`);
    }
  }
}

export function buildZoekprofielFields(
  ctx: ZoekprofielBuildContext,
  content: ZoekprofielContentResult
): ZoekprofielFields {
  if (!content.alinea_1_kern) {
    return { zoekprofiel: '' };
  }

  const alinea1Kern = stripSectionHeading(sanitizeParagraph(content.alinea_1_kern));
  const includeBelastbaarheidsClosing = ctx.meta.has_belastbaarheids_doc !== false;
  const datum = includeBelastbaarheidsClosing ? resolveBelastbaarheidsdatum(ctx, content) : '';
  const closing = includeBelastbaarheidsClosing
    ? buildPara1Closing(content.belastbaarheidsdocument_type, datum)
    : '';
  const para1 = [alinea1Kern, closing].filter(Boolean).join(' ');

  const para2 = content.alinea_2
    ? stripSectionHeading(sanitizeParagraph(content.alinea_2))
    : '';

  const zoekprofiel = [para1, para2].filter(Boolean).join('\n\n');
  validateZoekprofielOutput(zoekprofiel, alinea1Kern);

  return { zoekprofiel };
}
