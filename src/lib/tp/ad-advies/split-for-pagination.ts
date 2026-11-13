import { buildAdAdviesBlock, parseAdAdvies } from './build-fields';

/** How quotation marks are drawn when an advies quote is split across pages. */
export type AdAdviesQuoteMarks = 'both' | 'open' | 'none' | 'close';

export type AdAdviesFragment = {
  md: string;
  quoteMarks: AdAdviesQuoteMarks;
};

function opensQuote(marks: AdAdviesQuoteMarks): boolean {
  return marks === 'both' || marks === 'open';
}

function closesQuote(marks: AdAdviesQuoteMarks): boolean {
  return marks === 'both' || marks === 'close';
}

function toQuoteMarks(opens: boolean, closes: boolean): AdAdviesQuoteMarks {
  if (opens && closes) return 'both';
  if (opens) return 'open';
  if (closes) return 'close';
  return 'none';
}

/**
 * First fragment keeps the parent's opening mark, last keeps the closing mark.
 * An `open` parent never gains a closing mark; a `close` parent never gains an opening mark.
 */
export function distributeQuoteMarks(
  parent: AdAdviesQuoteMarks | undefined,
  count: number
): AdAdviesQuoteMarks[] {
  const marks = parent ?? 'both';
  if (count <= 1) return [marks];
  const opens = opensQuote(marks);
  const closes = closesQuote(marks);
  return Array.from({ length: count }, (_, index) =>
    toQuoteMarks(opens && index === 0, closes && index === count - 1)
  );
}

export function combineQuoteMarks(
  left: AdAdviesQuoteMarks | undefined,
  right: AdAdviesQuoteMarks | undefined
): AdAdviesQuoteMarks {
  return toQuoteMarks(opensQuote(left ?? 'both'), closesQuote(right ?? 'both'));
}

/** Blank lines, and a new numbered line, each start a functie. Body lines stay with that functie. */
function splitCitaatIntoFuncties(citaat: string): string[] {
  const paragraphs = citaat
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const functies: string[] = [];

  for (const paragraph of paragraphs) {
    let bucket: string[] = [];
    const flush = () => {
      const text = bucket.join('\n').trim();
      if (text) functies.push(text);
      bucket = [];
    };

    for (const line of paragraph.split('\n')) {
      if (/^\d+[.)]\s/.test(line.trim()) && bucket.length > 0) flush();
      bucket.push(line);
    }
    flush();
  }

  return functies;
}

function wrapFragment(intro: string, citaat: string, quoteMarks: AdAdviesQuoteMarks): AdAdviesFragment {
  return { md: buildAdAdviesBlock(intro, citaat), quoteMarks };
}

/**
 * Split a too-tall advies into one fragment per functie.
 * Returns null when there is nothing to separate, so a single-block advies stays intact.
 */
export function expandAdAdviesByFunctie(
  md: string,
  parentMarks?: AdAdviesQuoteMarks
): AdAdviesFragment[] | null {
  const { intro, citaat } = parseAdAdvies(md);
  const functies = splitCitaatIntoFuncties(citaat);
  if (functies.length < 2) return null;

  const marks = distributeQuoteMarks(parentMarks, functies.length);
  return functies.map((functie, index) =>
    wrapFragment(index === 0 ? intro : '', functie, marks[index])
  );
}

function splitOnSentence(text: string): [string, string] | null {
  if (text.length < 80) return null;
  const mid = Math.floor(text.length / 2);
  const re = /[.!?]["']?(?:\s+)/g;
  let best: number | null = null;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    const punctAt = match.index;
    if (punctAt > 0 && /\d/.test(text[punctAt - 1] ?? '')) continue;
    const idx = punctAt + match[0].length;
    if (idx >= text.length) continue;
    if (idx < 40 || text.length - idx < 40) continue;
    if (best === null || Math.abs(idx - mid) < Math.abs(best - mid)) best = idx;
  }

  if (best === null) return null;
  const left = text.slice(0, best).trim();
  const right = text.slice(best).trim();
  if (left.length < 40 || right.length < 40) return null;
  return [left, right];
}

function splitOnWords(text: string): [string, string] | null {
  const src = text.trim();
  if (!src) return null;

  const words = src.split(/\s+/).filter(Boolean);
  if (words.length >= 18) {
    const mid = Math.floor(words.length / 2);
    const left = words.slice(0, mid).join(' ').trim();
    const right = words.slice(mid).join(' ').trim();
    if (left.length > 15 && right.length > 15) return [left, right];
  }

  if (src.length >= 8) {
    const mid = Math.floor(src.length / 2);
    const left = src.slice(0, mid).trim();
    const right = src.slice(mid).trim();
    if (left.length > 2 && right.length > 2) return [left, right];
  }

  return null;
}

/**
 * Split one oversized functie inside the citaat. Sentence boundary first, then words.
 * Both pieces stay advies fragments (delimiter kept).
 */
export function splitAdAdviesInsideCitaat(
  md: string,
  parentMarks?: AdAdviesQuoteMarks
): [AdAdviesFragment, AdAdviesFragment] | null {
  const { intro, citaat } = parseAdAdvies(md);
  const trimmed = citaat.trim();
  if (!trimmed) return null;

  const parts = splitOnSentence(trimmed) ?? splitOnWords(trimmed);
  if (!parts) return null;

  const marks = distributeQuoteMarks(parentMarks, 2);
  return [
    wrapFragment(intro, parts[0], marks[0]),
    wrapFragment('', parts[1], marks[1]),
  ];
}

/** Join two pagination fragments without a second delimiter, and combine their quote marks. */
export function mergeAdAdviesFragments(
  left: { md: string; quoteMarks?: AdAdviesQuoteMarks },
  right: { md: string; quoteMarks?: AdAdviesQuoteMarks }
): { md: string; quoteMarks: AdAdviesQuoteMarks } {
  const a = parseAdAdvies(left.md);
  const b = parseAdAdvies(right.md);
  const intro = a.intro.trim() ? a.intro : b.intro;
  const citaat = [a.citaat.trim(), b.citaat.trim()].filter(Boolean).join('\n\n');
  return {
    md: buildAdAdviesBlock(intro, citaat),
    quoteMarks: combineQuoteMarks(left.quoteMarks, right.quoteMarks),
  };
}
