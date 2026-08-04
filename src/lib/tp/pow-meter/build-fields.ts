import {
  CONTROLEPUNT_LABEL,
  FORBIDDEN_TERMS,
  FORBIDDEN_WERKZAME_UREN_PHRASES,
  HUIDIGE_TREDE_TEMPLATE,
  INSCHALING_DELIMITER,
  MAX_SENTENCES_WERKZAME_UREN,
  MAX_WORDS_TOELICHTING,
  MAX_WORDS_WERKZAME_UREN,
  TOELICHTING_OPENER_PREFIX,
  TOELICHTING_POW_DELIMITER,
  VERWACHTING_OPENER,
  VERWACHTING_OPENER_SUFFIX,
  VISIE_OPENER_PREFIX,
  WERKZAME_UREN_EMPTY,
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

/** Drop trailing incomplete sentence when over word limit instead of mid-clause cut. */
export function truncateToWordLimitOnSentenceBoundary(text: string, maxWords: number): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (countWords(trimmed) <= maxWords) return trimmed;

  const sentences = splitSentences(trimmed);
  if (sentences.length === 0) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    return words.slice(0, maxWords).join(' ').replace(/[,;:\-–—]+$/, '').trim();
  }

  let result = '';
  for (const sentence of sentences) {
    const candidate = result ? `${result} ${sentence}` : sentence;
    if (countWords(candidate) <= maxWords) {
      result = candidate;
    } else {
      break;
    }
  }

  if (result) return result;

  const words = sentences[0]!.split(/\s+/).filter(Boolean);
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

/** Legacy V10 opener — kept for mapping heuristics / leak-stripping. */
export function buildToelichtingOpener(trede: TredeNumber): string {
  return TOELICHTING_OPENER_PREFIX.replace('[n]', String(trede));
}

export function buildWerkzameUrenText(
  hasWerkzameUren: boolean,
  modelText: string
): string {
  if (!hasWerkzameUren || !modelText.trim()) {
    return WERKZAME_UREN_EMPTY;
  }
  return sanitizeKernel(modelText);
}

export function appendControlepunt(visie: string, controlepunt: string): string {
  const body = String(visie || '').trim();
  const cp = String(controlepunt || '').trim();
  if (!cp) return body;
  if (!body) return `${CONTROLEPUNT_LABEL}\n${cp}`;
  return `${body}\n\n${CONTROLEPUNT_LABEL}\n${cp}`;
}

function stripLeakedSectionHeaders(text: string): string {
  let out = String(text || '');
  out = out.replace(/^Visie op plaatsbaarheid\s*/i, '');
  out = out.replace(/^Huidige trede POW-meter™\s*/i, '');
  out = out.replace(/^Huidige werkzame uren\s*/i, '');
  out = out.replace(/^Verwachting over 3 maanden\s*/i, '');
  return out.trim();
}

function stripFmlAndBedrijfsartsAttribution(text: string): string {
  let out = String(text || '');
  out = out.replace(
    /\bomdat\s+de\s+bedrijfsarts[\s\S]*?\bmet\s+een\s+/gi,
    'omdat er sprake is van een '
  );
  out = out.replace(/\bomdat\s+de\s+bedrijfsarts\b/gi, 'omdat');
  out = out.replace(/\bde\s+bedrijfsarts\b/gi, '');
  out = out.replace(/\b(in\s+de\s+)?fml\s+van\s+\d{1,2}\s+\p{L}+\s+\d{4}\b/giu, '');
  out = out.replace(/\b(in\s+de\s+)?(fml|izp|lab)\b/giu, '');
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').replace(/\s+\./g, '.').trim();
  return out;
}

/** Remove decision-tree jargon from client-facing toelichting. */
export function stripForbiddenToelichtingPhrases(text: string): string {
  let out = String(text || '');
  out = out.replace(
    /\b(er\s+)?(geen\s+)?(werknemer\s+)?(wel\s+)?(duurzaam\s+)?benutbare\s+mogelijkheden\s+(heeft|hebben|zijn)(\s+maar)?\s*/gi,
    ''
  );
  out = out.replace(/\b(geen\s+)?(duurzaam\s+)?benutbare\s+mogelijkheden\b/gi, '');
  out = out.replace(/\bomdat\s+maar\s+/gi, 'omdat ');
  out = out.replace(/\bomdat\s+werknemer\s+werknemer\b/gi, 'omdat werknemer');
  out = out.replace(/\bomdat\s+(is|zijn|was|waren|maar)\s+/gi, 'omdat ');
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').replace(/\s+\./g, '.').trim();
  return out;
}

export function sanitizeVisieText(visie: string): string {
  let text = stripForbiddenToelichtingPhrases(
    stripFmlAndBedrijfsartsAttribution(stripLeakedSectionHeaders(stripCitations(visie)))
  );
  text = text.replace(/\bomdat\s+(is|zijn|was|waren|maar)\s+/gi, 'omdat ');
  // Preserve paragraph breaks for Controlepunt append later; collapse only soft runs of spaces.
  text = text.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return truncateToWordLimitOnSentenceBoundary(text.replace(/\n/g, ' '), MAX_WORDS_TOELICHTING);
}

export function assemblePowMeterContent(content: PowMeterContentResult): AssembledPowMeterContent {
  const visie = sanitizeVisieText(content.visie_op_plaatsbaarheid);
  return {
    huidige_trede_tekst: buildHuidigeTredeText(content.huidige_trede_nummer),
    huidige_werkzame_uren: buildWerkzameUrenText(
      content.has_werkzame_uren,
      content.huidige_werkzame_uren
    ),
    verwachting_3_maanden: buildVerwachtingOpenerSentence(content.verwachting_trede_nummer),
    toelichting_pow: appendControlepunt(visie, content.controlepunt),
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
        const clampedRest =
          remainingBudget > 0
            ? truncateToWordLimitOnSentenceBoundary(restText, remainingBudget)
            : '';
        result = clampedRest ? `${openerSentence} ${clampedRest}`.trim() : openerSentence;
        return result;
      }
    }
    result = truncateToWordLimitOnSentenceBoundary(result, maxWords);
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
  const verwachtingSentences = splitSentences(content.verwachting_3_maanden);
  if (verwachtingSentences.length > 1) {
    console.warn('⚠️ POW-meter: verwachting should be exactly one sentence');
  }

  const toelichtingWords = countWords(content.toelichting_pow.replace(/\n/g, ' '));
  if (toelichtingWords > MAX_WORDS_TOELICHTING + 40) {
    console.warn(
      `⚠️ POW-meter: toelichting ${toelichtingWords} woorden (incl. controlepunt), soft max ${MAX_WORDS_TOELICHTING}`
    );
  }

  const lower = content.toelichting_pow.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term)) {
      console.warn(`⚠️ POW-meter: verboden term in toelichting: "${term}"`);
    }
  }

  if (/benutbare\s+mogelijkheden/i.test(content.toelichting_pow)) {
    console.warn('⚠️ POW-meter: "benutbare mogelijkheden" nog aanwezig in toelichting_pow');
  }
}

export function sanitizePowMeterContent(
  content: AssembledPowMeterContent,
  _source?: PowMeterContentResult
): AssembledPowMeterContent {
  let werkzameUren = content.huidige_werkzame_uren;
  if (werkzameUren !== WERKZAME_UREN_EMPTY) {
    werkzameUren = clampInschalingText(werkzameUren, {
      maxWords: MAX_WORDS_WERKZAME_UREN,
      maxSentences: MAX_SENTENCES_WERKZAME_UREN,
    });
  }
  containsForbiddenWerkzameUrenPhrase(werkzameUren);

  // Verwachting is always the exact one-liner from assembly — do not re-expand.
  const verwachting = content.verwachting_3_maanden.trim();

  // Preserve Controlepunt block when clamping body.
  let toelichting = content.toelichting_pow;
  const cpMarker = `\n\n${CONTROLEPUNT_LABEL}\n`;
  let controlepuntTail = '';
  const cpIdx = toelichting.indexOf(cpMarker);
  if (cpIdx >= 0) {
    controlepuntTail = toelichting.slice(cpIdx);
    toelichting = toelichting.slice(0, cpIdx);
  } else if (toelichting.startsWith(`${CONTROLEPUNT_LABEL}\n`)) {
    controlepuntTail = `\n\n${toelichting}`;
    toelichting = '';
  }

  toelichting = sanitizeVisieText(toelichting);
  toelichting = `${toelichting}${controlepuntTail}`.trim();

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

function stripStructuralNewlines(value: string): string {
  return String(value || '').replace(/^\n+/, '').replace(/\n+$/, '');
}

export function buildPowToelichtingBlock(toelichting: string): string {
  const text = String(toelichting || '');
  if (!text.trim()) return '';
  return `${TOELICHTING_POW_DELIMITER}\n${text}`;
}

export function buildPowMeterStorage(inschaling: PowInschalingData, toelichting: string): string {
  const parts = [buildPowInschalingBlock(inschaling), buildPowToelichtingBlock(toelichting)].filter(
    Boolean
  );
  return parts.join('\n\n');
}

function inschalingSegment(raw: string): string {
  const text = String(raw || '').trim();
  if (!text.includes(INSCHALING_DELIMITER)) return text;
  const afterInschaling = text.split(INSCHALING_DELIMITER)[1] ?? '';
  if (!afterInschaling.includes(TOELICHTING_POW_DELIMITER)) {
    return afterInschaling.trim();
  }
  return afterInschaling.split(TOELICHTING_POW_DELIMITER)[0]?.trim() ?? '';
}

export function parsePowInschaling(raw: string): PowInschalingData | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  if (text.includes(INSCHALING_DELIMITER)) {
    const block = inschalingSegment(text);
    try {
      const parsed = JSON.parse(block) as Record<string, unknown>;
      return {
        huidige_trede: String(parsed.huidige_trede ?? ''),
        werkzame_uren: String(parsed.werkzame_uren ?? ''),
        verwachting: String(parsed.verwachting ?? ''),
      };
    } catch {
      return null;
    }
  }

  return null;
}

export function parsePowToelichting(raw: string): string {
  const text = String(raw || '');
  if (!text.trim()) return '';

  if (text.includes(TOELICHTING_POW_DELIMITER)) {
    return stripStructuralNewlines(text.split(TOELICHTING_POW_DELIMITER)[1] ?? '');
  }

  if (!text.includes(INSCHALING_DELIMITER)) {
    return text;
  }

  return '';
}

export function updatePowMeterToelichting(raw: string, toelichting: string): string {
  const inschaling = parsePowInschaling(raw);
  const nextToelichting = String(toelichting || '');
  if (!inschaling) {
    return nextToelichting.trim() ? buildPowToelichtingBlock(nextToelichting) : String(raw || '');
  }
  return buildPowMeterStorage(inschaling, nextToelichting);
}

export function buildPowMeterFields(content: PowMeterContentResult): PowMeterFields {
  const assembled = assemblePowMeterContent(content);
  const sanitized = sanitizePowMeterContent(assembled, content);
  const inschaling: PowInschalingData = {
    huidige_trede: sanitized.huidige_trede_tekst,
    werkzame_uren: sanitized.huidige_werkzame_uren,
    verwachting: sanitized.verwachting_3_maanden,
  };

  return {
    pow_meter: buildPowMeterStorage(inschaling, sanitized.toelichting_pow),
  };
}

export function hasVerwachtingOpener(text: string): boolean {
  return text.trim().toLowerCase().startsWith(VERWACHTING_OPENER.toLowerCase());
}

export function hasToelichtingOpener(text: string, trede?: TredeNumber): boolean {
  const trimmed = text.trim().toLowerCase();
  if (trede !== undefined) {
    const legacy = buildToelichtingOpener(trede).toLowerCase();
    if (trimmed.startsWith(legacy)) return true;
    const v11 = `${VISIE_OPENER_PREFIX} ${trede}`.toLowerCase();
    if (trimmed.startsWith(v11)) return true;
  }
  return (
    /^Werknemer bevindt zich tijdens de intake in trede \d+ van de POW-meter™ omdat/i.test(
      trimmed
    ) ||
    /^Werknemer bevindt zich tijdens het intakegesprek in trede \d+ van de POW-meter™/i.test(
      trimmed
    )
  );
}
