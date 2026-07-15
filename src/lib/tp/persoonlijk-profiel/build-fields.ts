import {
  BANNED_PHRASES,
  MISSING_INFO_PATTERN,
  OPENING_PREFIX,
  SECTION_HEADING_PATTERN,
  SOURCE_REFERENCE_PATTERN,
} from './constants';
import type { PersoonlijkProfielContentResult } from './schema';

export type PersoonlijkProfielBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  details: { gender?: string | null; date_of_birth?: string | null };
};

export type PersoonlijkProfielFields = {
  persoonlijk_profiel: string;
};

export function calculateAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
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

export function stripSourceReferenceSentences(text: string): string {
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter(
    (sentence) =>
      !SOURCE_REFERENCE_PATTERN.test(sentence) && !MISSING_INFO_PATTERN.test(sentence)
  );
  if (kept.length === 0) return '';
  return kept.join(' ').replace(/\s{2,}/g, ' ').trim();
}

export function sanitizeFragment(text: string): string {
  let cleaned = stripCitations(text);
  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(re, '');
  }
  cleaned = stripSourceReferenceSentences(cleaned);
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

function sanitizeParagraph(text: string): string {
  return sanitizeFragment(text).replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function stripSectionHeading(text: string): string {
  return text.replace(SECTION_HEADING_PATTERN, '').trim();
}

export function hasValidOpening(alinea1: string): boolean {
  return alinea1.trimStart().startsWith(OPENING_PREFIX);
}

export function buildPersoonlijkProfielFields(
  _ctx: PersoonlijkProfielBuildContext,
  content: PersoonlijkProfielContentResult
): PersoonlijkProfielFields {
  const paragraphs = [content.alinea_1, content.alinea_2, content.alinea_3]
    .map((part) => (part ? stripSectionHeading(sanitizeParagraph(part)) : null))
    .filter((part): part is string => Boolean(part));

  if (paragraphs.length > 0 && !hasValidOpening(paragraphs[0])) {
    console.warn('⚠️ Persoonlijk profiel: alinea_1 missing mandatory opening sentence');
  }

  return { persoonlijk_profiel: paragraphs.join('\n\n') };
}
