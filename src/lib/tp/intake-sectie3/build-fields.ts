import { stripLeadingIntakeQuoteLabels } from '@/lib/tp/strip-intake-quote-labels';
import type { IntakeSectie3Content } from './schema';

export function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function sanitizeIntakeSectie3Content(content: IntakeSectie3Content): IntakeSectie3Content {
  return {
    korte_beschrijving_werkzaamheden: content.korte_beschrijving_werkzaamheden
      ? stripLeadingIntakeQuoteLabels(stripCitations(content.korte_beschrijving_werkzaamheden))
      : null,
  };
}

export function hasIntakeFunctiebeschrijving(content: IntakeSectie3Content): boolean {
  return Boolean(content.korte_beschrijving_werkzaamheden?.trim());
}
