import { BANNED_PHRASES } from './constants';
import type { SocialeAchtergrondContentResult } from './schema';

export type SocialeAchtergrondBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  details: { gender?: string | null };
};

export type SocialeAchtergrondFields = {
  sociale_achtergrond: string;
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

export function sanitizeFragment(text: string): string {
  let cleaned = stripCitations(text);
  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(re, '');
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

function sanitizeParagraph(text: string): string {
  return sanitizeFragment(text).replace(/\n+/g, ' ').trim();
}

export function buildSocialeAchtergrondFields(
  _ctx: SocialeAchtergrondBuildContext,
  content: SocialeAchtergrondContentResult
): SocialeAchtergrondFields {
  const paragraphs = [content.alinea_1, content.alinea_2, content.alinea_3]
    .map((part) => (part ? sanitizeParagraph(part) : null))
    .filter((part): part is string => Boolean(part));

  return { sociale_achtergrond: paragraphs.join('\n\n') };
}
