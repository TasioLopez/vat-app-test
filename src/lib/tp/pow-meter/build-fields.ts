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
  TOELICHTING_POW_DELIMITER,
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
  return truncateToWordLimitOnSentenceBoundary(text, maxWords);
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

  // Single sentence still too long — hard truncate that sentence only.
  const words = sentences[0]!.split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ').replace(/[,;:\-–—]+$/, '').trim();
}

function stripSpoor2FromKern(kern: string): string {
  let text = sanitizeKernel(kern);
  if (!text) return text;
  const block = SPOOR2_VERWACHTING_BLOCK;
  if (text.includes(block)) {
    text = text.replace(block, '').trim();
  }
  // Partial / fuzzy strip if model paraphrased start
  text = text.replace(/Daarnaast kunnen binnen het tweede spoor[\s\S]*?belastbaarheid\.?\s*/i, '').trim();
  return text;
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

function capitalizeFirstLetter(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Drop fragments that cannot stand as a post-opener sentence. */
function isInvalidVerwachtingBody(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  // Relative-clause residue without a finite clause subject ("de X is Y" after strip can be ok if capitalized)
  if (/^(is|zijn|was|waren|maar|,)\b/i.test(t)) return true;
  if (/^omdat\b/i.test(t)) return true;
  return false;
}

/**
 * Strip leaked verwachting opener and mid-sentence debris from model kern.
 */
export function stripLeakedVerwachtingOpener(kern: string, trede: TredeNumber): string {
  let text = sanitizeKernel(kern);
  const opener = buildVerwachtingOpenerSentence(trede);
  if (text.toLowerCase().startsWith(opener.toLowerCase())) {
    text = text.slice(opener.length).trim();
  }
  // Allow period or comma after POW-meter™ in leaked openers.
  text = text
    .replace(
      /^Werknemer bevindt zich vermoedelijk in trede \d+ van de POW-meter™[.,]?\s*/i,
      ''
    )
    .trim();
  // Leading debris from bad joins.
  text = text.replace(/^[,:;–—-]+\s*/u, '').trim();
  text = text.replace(/^omdat\s+/i, '').trim();
  text = text.replace(/^,\s*de\s+/i, '').trim();

  if (isInvalidVerwachtingBody(text)) return '';

  // Capitalize sentence start after opener (which ends with ".").
  return capitalizeFirstLetter(text);
}

export function sanitizeVerwachtingBody(body: string): string {
  let text = sanitizeKernel(body);
  text = text.replace(/^[,:;–—-]+\s*/u, '').trim();
  text = text.replace(/^omdat\s+/i, '').trim();
  if (isInvalidVerwachtingBody(text)) return '';
  return capitalizeFirstLetter(text);
}

function stripLeakedToelichtingOpener(kern: string, trede: TredeNumber): string {
  let text = sanitizeKernel(kern);
  const opener = buildToelichtingOpener(trede);
  if (text.toLowerCase().startsWith(opener.toLowerCase())) {
    text = text.slice(opener.length).trim();
  }
  text = text
    .replace(/^Werknemer bevindt zich tijdens de intake in trede \d+ van de POW-meter™ omdat\s*/i, '')
    .trim();
  return text;
}

/** Clean toelichting continuation after "omdat"; drop orphan fragments. */
export function sanitizeToelichtingBody(body: string): string {
  let text = sanitizeKernel(body);
  text = text.replace(/^[,:;–—-]+\s*/u, '').trim();
  // Orphan verb starts after aggressive stripping.
  if (/^(is|zijn|was|waren|maar)\b/i.test(text)) {
    text = text.replace(/^(is|zijn|was|waren|maar)\s+/i, '').trim();
  }
  if (!text || /^(is|zijn|was|waren|maar)\b/i.test(text)) return '';
  // Prefer lowercase first letter after "omdat" for natural Dutch continuation when it's "haar/zijn/werknemer..."
  return text;
}

export function buildVerwachtingText(trede: TredeNumber, kern: string): string {
  const body = sanitizeVerwachtingBody(stripLeakedVerwachtingOpener(kern, trede));
  const opener = buildVerwachtingOpenerSentence(trede);
  return body ? `${opener} ${body}` : opener;
}

/** Assemble verwachting body; Spoor 2 block is appended server-side during sanitize. */
export function buildVerwachtingWithSpoor2(
  trede: TredeNumber,
  kern: string,
  _includeSpoor2: boolean
): string {
  const cleanedKern = stripSpoor2FromKern(kern);
  return buildVerwachtingText(trede, cleanedKern);
}

export function buildToelichtingText(trede: TredeNumber, kern: string): string {
  const body = sanitizeToelichtingBody(stripLeakedToelichtingOpener(kern, trede));
  const opener = buildToelichtingOpener(trede);
  return body ? `${opener} ${body}` : opener;
}

export function assemblePowMeterContent(content: PowMeterContentResult): AssembledPowMeterContent {
  return {
    huidige_trede_tekst: buildHuidigeTredeText(content.huidige_trede_nummer),
    huidige_werkzame_uren: sanitizeKernel(content.huidige_werkzame_uren),
    verwachting_3_maanden: buildVerwachtingWithSpoor2(
      content.verwachting_trede_nummer,
      content.verwachting_kern,
      content.verwachting_includes_spoor2_block
    ),
    toelichting_pow: buildToelichtingText(
      content.huidige_trede_nummer,
      content.toelichting_kern
    ),
  };
}

function clampVerwachtingWithSpoor2(
  text: string,
  trede: TredeNumber,
  includeSpoor2: boolean
): string {
  const opener = buildVerwachtingOpenerSentence(trede);
  const spoor2 = includeSpoor2 ? SPOOR2_VERWACHTING_BLOCK : '';
  const reservedWords =
    countWords(opener) + (spoor2 ? countWords(spoor2) : 0);
  const bodyBudget = Math.max(0, MAX_WORDS_VERWACHTING - reservedWords);

  let body = text.trim();
  if (body.toLowerCase().startsWith(opener.toLowerCase())) {
    body = body.slice(opener.length).trim();
  }
  body = stripSpoor2FromKern(body);
  body = truncateToWordLimitOnSentenceBoundary(body, bodyBudget);

  const parts = [opener];
  if (body) parts.push(body);
  if (spoor2) parts.push(spoor2);

  let result = parts.join(' ').trim();
  const sentences = splitSentences(result);
  result = sentences.slice(0, MAX_SENTENCES_VERWACHTING).join(' ').trim();
  return result;
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

function validateAssembledOutput(
  content: AssembledPowMeterContent,
  source?: PowMeterContentResult
): void {
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

  if (/benutbare\s+mogelijkheden/i.test(content.toelichting_pow)) {
    console.warn('⚠️ POW-meter: "benutbare mogelijkheden" nog aanwezig in toelichting_pow');
  }

  if (source && source.huidige_trede_nummer <= 2) {
    const lowerToel = content.toelichting_pow.toLowerCase();
    if (/spoor\s*1\s+actief|activeringsplek|aangepast werk binnen spoor 1/i.test(lowerToel)) {
      console.warn(
        `⚠️ POW-meter: toelichting mentions Spoor 1/activation but huidige trede is ${source.huidige_trede_nummer}`
      );
    }
  }
}

function stripFmlAndBedrijfsartsAttribution(text: string): string {
  let out = String(text || '');

  // Remove common source/date attribution phrases while keeping the factual remainder.
  out = out.replace(
    /\bomdat\s+de\s+bedrijfsarts[\s\S]*?\bmet\s+een\s+/gi,
    'omdat er sprake is van een '
  );
  out = out.replace(/\bomdat\s+de\s+bedrijfsarts\b/gi, 'omdat');
  out = out.replace(/\bde\s+bedrijfsarts\b/gi, '');

  // Strip explicit document references + dates (keep surrounding facts).
  out = out.replace(/\b(in\s+de\s+)?fml\s+van\s+\d{1,2}\s+\p{L}+\s+\d{4}\b/giu, '');
  out = out.replace(/\b(in\s+de\s+)?(fml|izp|lab)\b/giu, '');

  // Collapse whitespace and fix double punctuation.
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').replace(/\s+\./g, '.').trim();
  return out;
}

/** Remove decision-tree jargon ("benutbare mogelijkheden") from client-facing toelichting. */
export function stripForbiddenToelichtingPhrases(text: string): string {
  let out = String(text || '');

  // Decision-tree echo after "omdat" / in kernel (order matters).
  out = out.replace(
    /\b(er\s+)?(geen\s+)?(werknemer\s+)?(wel\s+)?(duurzaam\s+)?benutbare\s+mogelijkheden\s+(heeft|hebben|zijn)(\s+maar)?\s*/gi,
    ''
  );
  // Standalone mentions (incl. "geen …").
  out = out.replace(/\b(geen\s+)?(duurzaam\s+)?benutbare\s+mogelijkheden\b/gi, '');

  // Grammar cleanup after stripping.
  out = out.replace(/\bomdat\s+maar\s+/gi, 'omdat ');
  out = out.replace(/\bomdat\s+werknemer\s+werknemer\b/gi, 'omdat werknemer');
  // Orphan verb after "omdat" (e.g. "omdat is voor zorg").
  out = out.replace(/\bomdat\s+(is|zijn|was|waren|maar)\s+/gi, 'omdat ');
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').replace(/\s+\./g, '.').trim();
  return out;
}

export function sanitizePowMeterContent(
  content: AssembledPowMeterContent,
  source?: PowMeterContentResult
): AssembledPowMeterContent {
  const werkzameUren = clampInschalingText(content.huidige_werkzame_uren, {
    maxWords: MAX_WORDS_WERKZAME_UREN,
    maxSentences: MAX_SENTENCES_WERKZAME_UREN,
  });
  containsForbiddenWerkzameUrenPhrase(werkzameUren);

  const verwachting =
    source != null
      ? clampVerwachtingWithSpoor2(
          content.verwachting_3_maanden,
          source.verwachting_trede_nummer,
          source.verwachting_includes_spoor2_block
        )
      : clampInschalingText(content.verwachting_3_maanden, {
          maxWords: MAX_WORDS_VERWACHTING,
          maxSentences: MAX_SENTENCES_VERWACHTING,
          preserveOpener: VERWACHTING_OPENER,
        });

  let toelichting = stripForbiddenToelichtingPhrases(
    stripFmlAndBedrijfsartsAttribution(stripCitations(content.toelichting_pow))
  );
  // Re-heal "omdat is/zijn…" orphans after strip.
  toelichting = toelichting.replace(/\bomdat\s+(is|zijn|was|waren|maar)\s+/gi, 'omdat ');
  toelichting = truncateToWordLimitOnSentenceBoundary(toelichting, MAX_WORDS_TOELICHTING);

  const sanitized: AssembledPowMeterContent = {
    huidige_trede_tekst: stripCitations(content.huidige_trede_tekst),
    huidige_werkzame_uren: werkzameUren,
    verwachting_3_maanden: verwachting,
    toelichting_pow: toelichting,
  };

  validateAssembledOutput(sanitized, source);
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

/** Strip structural newlines from delimiter joins without eating typing spaces. */
function stripStructuralNewlines(value: string): string {
  return String(value || '').replace(/^\n+/, '').replace(/\n+$/, '');
}

export function buildPowToelichtingBlock(toelichting: string): string {
  const text = String(toelichting || '');
  if (!text.trim()) return '';
  return `${TOELICHTING_POW_DELIMITER}\n${text}`;
}

export function buildPowMeterStorage(inschaling: PowInschalingData, toelichting: string): string {
  const parts = [buildPowInschalingBlock(inschaling), buildPowToelichtingBlock(toelichting)].filter(Boolean);
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
        // Preserve typing spaces — do not trim field bodies.
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
    return trimmed.startsWith(buildToelichtingOpener(trede).toLowerCase());
  }
  return /^Werknemer bevindt zich tijdens de intake in trede \d+ van de POW-meter™ omdat/.test(trimmed);
}
