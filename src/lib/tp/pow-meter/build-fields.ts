import {
  FORBIDDEN_TERMS,
  FORBIDDEN_WERKZAME_UREN_PHRASES,
  HUIDIGE_TREDE_TEMPLATE,
  INSCHALING_DELIMITER,
  MAX_SENTENCES_VERWACHTING,
  MAX_SENTENCES_WERKZAME_UREN,
  MAX_WORDS_TOELICHTING,
  MAX_WORDS_VERWACHTING,
  MAX_WORDS_WERKZAME_UREN,
  SPOOR2_VERWACHTING_BLOCK,
  TOELICHTING_OPENER_PREFIX,
  VERWACHTING_OPENER,
  VERWACHTING_OPENER_SUFFIX,
  type TredeNumber,
} from './constants';
import type { AssembledPowMeterContent, PowMeterContentResult } from './schema';

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

export function countWords(text: string): number {
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
  return sentences.find((sentence) => sentence.toLowerCase().startsWith(lowerOpener)) ?? null;
}

function sanitizeKernel(text: string): string {
  return stripCitations(text).replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function buildHuidigeTredeText(trede: TredeNumber): string {
  return HUIDIGE_TREDE_TEMPLATE.replace('[n]', String(trede));
}

export function buildVerwachtingOpenerSentence(trede: TredeNumber): string {
  return `${VERWACHTING_OPENER} ${trede} ${VERWACHTING_OPENER_SUFFIX}`;
}

export function buildToelichtingOpener(trede: TredeNumber): string {
  return TOELICHTING_OPENER_PREFIX.replace('[n]', String(trede));
}

function stripLeakedVerwachtingOpener(kern: string, trede: TredeNumber): string {
  let text = sanitizeKernel(kern);
  const opener = buildVerwachtingOpenerSentence(trede);
  if (text.toLowerCase().startsWith(opener.toLowerCase())) {
    text = text.slice(opener.length).trim();
  }
  if (text.toLowerCase().startsWith(VERWACHTING_OPENER.toLowerCase())) {
    text = text.replace(/^Werknemer bevindt zich vermoedelijk in trede \d+ van de POW-meter™\.?\s*/i, '').trim();
  }
  return text;
}

function stripLeakedToelichtingOpener(kern: string, trede: TredeNumber): string {
  let text = sanitizeKernel(kern);
  const opener = buildToelichtingOpener(trede);
  if (text.toLowerCase().startsWith(opener.toLowerCase())) {
    text = text.slice(opener.length).trim();
  }
  text = text.replace(/^Werknemer bevindt zich tijdens de intake in trede \d+ van de POW-meter™ omdat\s*/i, '').trim();
  return text;
}

export function buildVerwachtingText(trede: TredeNumber, kern: string): string {
  const body = stripLeakedVerwachtingOpener(kern, trede);
  const opener = buildVerwachtingOpenerSentence(trede);
  return body ? `${opener} ${body}` : opener;
}

export function buildToelichtingText(trede: TredeNumber, kern: string): string {
  const body = stripLeakedToelichtingOpener(kern, trede);
  const opener = buildToelichtingOpener(trede);
  return body ? `${opener} ${body}` : `${opener} ${body}`.trim();
}

export function assemblePowMeterContent(content: PowMeterContentResult): AssembledPowMeterContent {
  return {
    huidige_trede_tekst: buildHuidigeTredeText(content.huidige_trede_nummer),
    huidige_werkzame_uren: sanitizeKernel(content.huidige_werkzame_uren),
    verwachting_3_maanden: buildVerwachtingText(
      content.verwachting_trede_nummer,
      content.verwachting_kern
    ),
    toelichting_pow: buildToelichtingText(
      content.huidige_trede_nummer,
      content.toelichting_kern
    ),
  };
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

function containsForbiddenWerkzameUrenPhrase(text: string): void {
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_WERKZAME_UREN_PHRASES) {
    if (lower.includes(phrase)) {
      console.warn(`⚠️ POW-meter: verboden formulering in werkzame uren: "${phrase}"`);
    }
  }
}

function validateAssembledOutput(content: AssembledPowMeterContent): void {
  const verwachtingWords = countWords(content.verwachting_3_maanden);
  if (verwachtingWords > MAX_WORDS_VERWACHTING) {
    console.warn(
      `⚠️ POW-meter: verwachting ${verwachtingWords} woorden, max ${MAX_WORDS_VERWACHTING}`
    );
  }

  const toelichtingWords = countWords(content.toelichting_pow);
  if (toelichtingWords > MAX_WORDS_TOELICHTING) {
    console.warn(
      `⚠️ POW-meter: toelichting ${toelichtingWords} woorden, max ${MAX_WORDS_TOELICHTING}`
    );
  }

  if (content.toelichting_pow.toLowerCase().includes(SPOOR2_VERWACHTING_BLOCK.slice(0, 40).toLowerCase())) {
    console.warn('⚠️ POW-meter: Spoor 2-block hoort niet in toelichting_pow');
  }

  const lower = content.toelichting_pow.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term)) {
      console.warn(`⚠️ POW-meter: verboden term in toelichting: "${term}"`);
    }
  }
}

export function sanitizePowMeterContent(content: AssembledPowMeterContent): AssembledPowMeterContent {
  const werkzameUren = clampInschalingText(content.huidige_werkzame_uren, {
    maxWords: MAX_WORDS_WERKZAME_UREN,
    maxSentences: MAX_SENTENCES_WERKZAME_UREN,
  });
  containsForbiddenWerkzameUrenPhrase(werkzameUren);

  const verwachting = clampInschalingText(content.verwachting_3_maanden, {
    maxWords: MAX_WORDS_VERWACHTING,
    maxSentences: MAX_SENTENCES_VERWACHTING,
    preserveOpener: VERWACHTING_OPENER,
  });

  const toelichting = truncateToWordLimit(stripCitations(content.toelichting_pow), MAX_WORDS_TOELICHTING);

  const sanitized: AssembledPowMeterContent = {
    huidige_trede_tekst: stripCitations(content.huidige_trede_tekst),
    huidige_werkzame_uren: werkzameUren,
    verwachting_3_maanden: verwachting,
    toelichting_pow: toelichting,
  };

  validateAssembledOutput(sanitized);
  return sanitized;
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
  const assembled = assemblePowMeterContent(content);
  const sanitized = sanitizePowMeterContent(assembled);
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

export function hasToelichtingOpener(text: string, trede: TredeNumber): boolean {
  return text.trim().toLowerCase().startsWith(buildToelichtingOpener(trede).toLowerCase());
}
