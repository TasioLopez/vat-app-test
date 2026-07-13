import type { IntakeSectie5Content } from './schema';

export function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function sanitizeIntakeSectie5Content(content: IntakeSectie5Content): IntakeSectie5Content {
  return {
    quote_prognose_advies_belastbaarheid: content.quote_prognose_advies_belastbaarheid
      ? stripCitations(content.quote_prognose_advies_belastbaarheid)
      : null,
  };
}

export function hasIntakeSectie5PrognoseQuote(content: IntakeSectie5Content): boolean {
  return Boolean(content.quote_prognose_advies_belastbaarheid?.trim());
}
