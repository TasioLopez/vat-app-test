import {
  INSCHALING_DELIMITER,
  MAX_SENTENCES_VERWACHTING,
  MAX_SENTENCES_WERKZAME_UREN,
  MAX_WORDS_VERWACHTING,
  MAX_WORDS_WERKZAME_UREN,
  VERWACHTING_OPENER,
} from './constants';
import type { PowMeterContentResult } from './schema';

export type PowInschalingData = {
  huidige_trede: string;
  werkzame_uren: string;
  verwachting: string;
};

export type PowMeterFields = {
  pow_meter: string;
  visie_plaatsbaarheid: string;
};

export type ClampInschalingOptions = {
  maxWords: number;
  maxSentences: number;
  preserveOpener?: string;
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

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const parts = cleaned.split(/(?<=[.!?])\s+/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function truncateToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ').replace(/[,;:\-–—]+$/, '').trim();
}

function findOpenerSentence(sentences: string[], opener: string): string | null {
  const lowerOpener = opener.toLowerCase();
  return (
    sentences.find((sentence) => sentence.toLowerCase().startsWith(lowerOpener)) ?? null
  );
}

export function clampInschalingText(
  text: string,
  { maxWords, maxSentences, preserveOpener }: ClampInschalingOptions
): string {
  const cleaned = stripCitations(text);
  if (!cleaned) return cleaned;

  let sentences = splitSentences(cleaned);

  if (preserveOpener) {
    const openerSentence = findOpenerSentence(sentences, preserveOpener);
    if (openerSentence) {
      const rest = sentences.filter((sentence) => sentence !== openerSentence);
      sentences = [openerSentence, ...rest];
    }
  }

  sentences = sentences.slice(0, maxSentences);
  let result = sentences.join(' ').trim();

  if (countWords(result) > maxWords) {
    if (preserveOpener) {
      const openerSentence = findOpenerSentence(sentences, preserveOpener);
      if (openerSentence) {
        const rest = sentences.filter((sentence) => sentence !== openerSentence);
        const openerWords = countWords(openerSentence);
        const remainingBudget = Math.max(0, maxWords - openerWords);
        const restText = rest.join(' ').trim();
        const clampedRest = remainingBudget > 0 ? truncateToWordLimit(restText, remainingBudget) : '';
        result = clampedRest ? `${openerSentence} ${clampedRest}`.trim() : openerSentence;
        return result;
      }
    }
    result = truncateToWordLimit(result, maxWords);
  }

  return result;
}

export function sanitizePowMeterContent(content: PowMeterContentResult): PowMeterContentResult {
  return {
    huidige_trede_tekst: stripCitations(content.huidige_trede_tekst),
    huidige_werkzame_uren: clampInschalingText(content.huidige_werkzame_uren, {
      maxWords: MAX_WORDS_WERKZAME_UREN,
      maxSentences: MAX_SENTENCES_WERKZAME_UREN,
    }),
    verwachting_3_maanden: clampInschalingText(content.verwachting_3_maanden, {
      maxWords: MAX_WORDS_VERWACHTING,
      maxSentences: MAX_SENTENCES_VERWACHTING,
      preserveOpener: VERWACHTING_OPENER,
    }),
    toelichting_pow: stripCitations(content.toelichting_pow),
  };
}

export function buildPowInschalingBlock(data: PowInschalingData): string {
  const json = JSON.stringify({
    huidige_trede: data.huidige_trede,
    werkzame_uren: data.werkzame_uren,
    verwachting: data.verwachting,
  });
  return `${INSCHALING_DELIMITER}\n${json}`;
}

export function parsePowInschaling(raw: string): PowInschalingData | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  if (text.includes(INSCHALING_DELIMITER)) {
    const block = text.split(INSCHALING_DELIMITER)[1]?.trim() ?? '';
    try {
      const parsed = JSON.parse(block) as Record<string, unknown>;
      return {
        huidige_trede: String(parsed.huidige_trede ?? '').trim(),
        werkzame_uren: String(parsed.werkzame_uren ?? '').trim(),
        verwachting: String(parsed.verwachting ?? '').trim(),
      };
    } catch {
      return null;
    }
  }

  return null;
}

export function buildPowMeterFields(content: PowMeterContentResult): PowMeterFields {
  const sanitized = sanitizePowMeterContent(content);
  const inschaling: PowInschalingData = {
    huidige_trede: sanitized.huidige_trede_tekst,
    werkzame_uren: sanitized.huidige_werkzame_uren,
    verwachting: sanitized.verwachting_3_maanden,
  };

  return {
    pow_meter: buildPowInschalingBlock(inschaling),
    visie_plaatsbaarheid: sanitized.toelichting_pow,
  };
}

export function hasVerwachtingOpener(text: string): boolean {
  return text.trim().toLowerCase().startsWith(VERWACHTING_OPENER.toLowerCase());
}
