import { ALINEA_1_KEYS, ALINEA_2_KEYS, ALINEA_3_KEYS, BANNED_PHRASES } from './constants';
import type { SocialeAchtergrondContentResult, SocialeAchtergrondTopicKey } from './schema';

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

function ensureSentenceEnd(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

export function sanitizeFragment(text: string): string {
  let cleaned = stripCitations(text);
  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(re, '');
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

export function buildParagraph(parts: (string | null)[]): string | null {
  const sentences = parts
    .map((part) => (part ? sanitizeFragment(part) : null))
    .filter((part): part is string => Boolean(part))
    .map(ensureSentenceEnd);

  if (sentences.length === 0) return null;
  return sentences.join(' ');
}

function pickParts(
  content: SocialeAchtergrondContentResult,
  keys: readonly SocialeAchtergrondTopicKey[]
): (string | null)[] {
  return keys.map((key) => content[key]);
}

export function buildSocialeAchtergrondFields(
  _ctx: SocialeAchtergrondBuildContext,
  content: SocialeAchtergrondContentResult
): SocialeAchtergrondFields {
  const paragraphs = [
    buildParagraph(pickParts(content, ALINEA_1_KEYS)),
    buildParagraph(pickParts(content, ALINEA_2_KEYS)),
    buildParagraph(pickParts(content, ALINEA_3_KEYS)),
  ].filter((p): p is string => Boolean(p));

  return { sociale_achtergrond: paragraphs.join('\n\n') };
}
