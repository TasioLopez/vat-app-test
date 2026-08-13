import {
  OPENING_PATTERN,
  PARA1_CLOSING_TEMPLATES,
  SECTION_HEADING_PATTERN,
  type BelastbaarheidsdocumentType,
} from './constants';
import type { ZoekprofielContentResult } from './schema';
import {
  formatValidationIssues,
  validateZoekprofielOutput,
  type ZoekprofielBuildContext,
  type ZoekprofielValidationIssue,
} from './validate-output';

export type { ZoekprofielBuildContext };

export type ZoekprofielFields = {
  zoekprofiel: string;
  clarificationQuestion?: string;
  validationIssues?: ZoekprofielValidationIssue[];
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

export const hasV13OpeningSentence = hasV2OpeningSentence;

export function resolveBelastbaarheidsdatum(
  ctx: ZoekprofielBuildContext,
  content: ZoekprofielContentResult
): string {
  return (
    (ctx.meta.leading_belastbaarheidsdocument_datum_voluit || '').trim() ||
    (ctx.meta.fml_izp_lab_date_voluit || '').trim() ||
    (content.belastbaarheidsdocument_datum_voluit || '').trim()
  );
}

export function resolveBelastbaarheidsType(
  ctx: ZoekprofielBuildContext,
  content: ZoekprofielContentResult
): BelastbaarheidsdocumentType {
  return (
    ctx.meta.leading_belastbaarheidsdocument_type ||
    content.belastbaarheidsdocument_type
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

export function buildZoekprofielFields(
  ctx: ZoekprofielBuildContext,
  content: ZoekprofielContentResult
): ZoekprofielFields {
  if (content.verduidelijkingsvraag) {
    return {
      zoekprofiel: '',
      clarificationQuestion: content.verduidelijkingsvraag,
    };
  }

  if (!content.alinea_1_kern) {
    return { zoekprofiel: '' };
  }

  const alinea1Kern = stripSectionHeading(sanitizeParagraph(content.alinea_1_kern));
  const includeBelastbaarheidsClosing = ctx.meta.has_belastbaarheids_doc !== false;
  const docType = resolveBelastbaarheidsType(ctx, content);
  const datum = includeBelastbaarheidsClosing ? resolveBelastbaarheidsdatum(ctx, content) : '';
  const closing = includeBelastbaarheidsClosing
    ? buildPara1Closing(docType, datum)
    : '';
  const para1 = [alinea1Kern, closing].filter(Boolean).join(' ');

  const para2 = content.alinea_2
    ? stripSectionHeading(sanitizeParagraph(content.alinea_2))
    : '';

  const zoekprofiel = [para1, para2].filter(Boolean).join('\n\n');
  const validation = validateZoekprofielOutput(zoekprofiel, alinea1Kern, ctx, content);

  if (!validation.ok) {
    for (const message of formatValidationIssues(validation.issues)) {
      console.warn(`⚠️ Zoekprofiel: ${message}`);
    }
  }

  const blockingIssues = validation.issues.filter((i) => !i.warning);
  return {
    zoekprofiel,
    validationIssues: blockingIssues.length ? validation.issues : undefined,
  };
}
