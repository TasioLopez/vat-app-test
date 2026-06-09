import {
  FML_ALINEA_2_TEMPLATE,
  IZP_ALINEA_2_TEMPLATE,
  NIVEAU_SENTENCE_PATTERN,
  SECTION_HEADING_PATTERN,
} from './constants';
import type { ZoekprofielContentResult } from './schema';

export type ZoekprofielBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  meta: { fml_izp_lab_date_voluit?: string | null };
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

export function hasNiveauSentence(text: string): boolean {
  return NIVEAU_SENTENCE_PATTERN.test(text);
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

export function buildAlinea2(
  type: 'fml' | 'izp',
  datumVoluit: string
): string {
  const template = type === 'izp' ? IZP_ALINEA_2_TEMPLATE : FML_ALINEA_2_TEMPLATE;
  if (!datumVoluit) {
    console.warn('⚠️ Zoekprofiel: belastbaarheidsdocument datum ontbreekt voor alinea 2');
    return template.replace(' op [datum]', '').replace('[datum]', '').trim();
  }
  return template.replace('[datum]', datumVoluit);
}

export function buildZoekprofielFields(
  ctx: ZoekprofielBuildContext,
  content: ZoekprofielContentResult
): ZoekprofielFields {
  const paragraphs: string[] = [];

  if (content.alinea_1) {
    const alinea1 = stripSectionHeading(sanitizeParagraph(content.alinea_1));
    if (!hasNiveauSentence(alinea1)) {
      console.warn('⚠️ Zoekprofiel: alinea_1 missing mandatory niveau sentence');
    }
    paragraphs.push(alinea1);
  }

  const datum = resolveBelastbaarheidsdatum(ctx, content);
  paragraphs.push(buildAlinea2(content.belastbaarheidsdocument_type, datum));

  if (content.alinea_3) {
    paragraphs.push(stripSectionHeading(sanitizeParagraph(content.alinea_3)));
  }

  if (content.heeft_fysieke_beperkingen && content.alinea_4) {
    paragraphs.push(stripSectionHeading(sanitizeParagraph(content.alinea_4)));
  }

  const zoekprofiel = paragraphs.filter(Boolean).join('\n\n');
  if (!content.alinea_1) {
    return { zoekprofiel: '' };
  }

  return { zoekprofiel };
}
