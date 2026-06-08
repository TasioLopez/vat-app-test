import {
  SECTION_HEADING_PATTERN,
  SPOOR2_NEUTRAL_CLOSING,
  SPOOR2_NEUTRAL_CLOSING_MARKER,
} from './constants';
import type { VisieWerknemerContentResult } from './schema';

export type VisieWerknemerBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  details: { gender?: string | null };
};

export type VisieWerknemerFields = {
  visie_werknemer: string;
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

function sanitizeParagraph(text: string): string {
  return stripCitations(text).replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function stripSectionHeading(text: string): string {
  return text.replace(SECTION_HEADING_PATTERN, '').trim();
}

function ensureSpoor2Closing(alinea2: string, hasConcretePreferences: boolean): string {
  if (hasConcretePreferences) return alinea2;
  if (alinea2.toLowerCase().includes(SPOOR2_NEUTRAL_CLOSING_MARKER.toLowerCase())) {
    return alinea2;
  }
  const trimmed = alinea2.trim();
  if (!trimmed) return SPOOR2_NEUTRAL_CLOSING;
  const separator = /[.!?]$/.test(trimmed) ? ' ' : '. ';
  return `${trimmed}${separator}${SPOOR2_NEUTRAL_CLOSING}`;
}

export function buildVisieWerknemerFields(
  _ctx: VisieWerknemerBuildContext,
  content: VisieWerknemerContentResult
): VisieWerknemerFields {
  const paragraphs: string[] = [];

  if (content.alinea_1) {
    paragraphs.push(stripSectionHeading(sanitizeParagraph(content.alinea_1)));
  }

  if (content.alinea_2) {
    let alinea2 = stripSectionHeading(sanitizeParagraph(content.alinea_2));
    alinea2 = ensureSpoor2Closing(alinea2, content.heeft_concrete_spoor2_voorkeuren);
    if (alinea2) paragraphs.push(alinea2);
  }

  return { visie_werknemer: paragraphs.filter(Boolean).join('\n\n') };
}
