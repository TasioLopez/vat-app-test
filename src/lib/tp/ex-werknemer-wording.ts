/** Wording helpers when the intake marks the worker as ex-werknemer (Juni V6 checkbox). */

const EX_WERKNEMER_LABEL = 'Ex-werknemer';

/** Coerce ex-werknemer flag; null/unknown/missing → false (only explicit true counts). */
export function normalizeExWerknemer(value: unknown): boolean {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return false;
}

export function isExWerknemer(meta?: { is_ex_werknemer?: boolean | null }): boolean {
  return meta?.is_ex_werknemer === true;
}

/**
 * Deterministic Ex-werknemer checkbox detection from intake plain text (Juni V6).
 * Only returns true/false when a checkbox glyph/mark is adjacent to "Ex-werknemer".
 * Returns null when no clear checkbox state is found (caller may fall back to model).
 */
export function detectExWerknemerFromText(text: string | null | undefined): boolean | null {
  if (!text) return null;
  const normalized = text.replace(/\u00a0/g, ' ');

  const label = EX_WERKNEMER_LABEL.replace('-', '[-\\s]?');

  // Checked: ☒ Ex-werknemer / Ex-werknemer ☒ / [x] Ex-werknemer
  if (
    new RegExp(`[☒☑✓✔]\\s*${label}\\b`, 'i').test(normalized) ||
    new RegExp(`\\b${label}\\s*[☒☑✓✔]`, 'i').test(normalized) ||
    new RegExp(`\\[[xX]\\]\\s*${label}\\b`, 'i').test(normalized) ||
    new RegExp(`\\b${label}\\s*\\[[xX]\\]`, 'i').test(normalized) ||
    new RegExp(`\\([xX]\\)\\s*${label}\\b`, 'i').test(normalized) ||
    new RegExp(`\\b${label}\\s*\\([xX]\\)`, 'i').test(normalized)
  ) {
    return true;
  }

  // Unchecked: ☐ Ex-werknemer / Ex-werknemer ☐
  if (
    new RegExp(`[☐□]\\s*${label}\\b`, 'i').test(normalized) ||
    new RegExp(`\\b${label}\\s*[☐□]`, 'i').test(normalized) ||
    new RegExp(`\\[\\s*\\]\\s*${label}\\b`, 'i').test(normalized) ||
    new RegExp(`\\b${label}\\s*\\[\\s*\\]`, 'i').test(normalized) ||
    new RegExp(`\\(\\s*\\)\\s*${label}\\b`, 'i').test(normalized) ||
    new RegExp(`\\b${label}\\s*\\(\\s*\\)`, 'i').test(normalized)
  ) {
    return false;
  }

  return null;
}

/**
 * Merge model `is_ex_werknemer` with deterministic text detection.
 * Text true/false wins; when text is inconclusive, keep model true only if already true, else false.
 */
export function applyExWerknemerFromText(
  modelValue: unknown,
  exWerknemerFromText: boolean | null
): boolean {
  if (exWerknemerFromText !== null) return exWerknemerFromText;
  return modelValue === true;
}

export function intakeTextHasExWerknemerLabel(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\bEx[-\s]?werknemer\b/i.test(text.replace(/\u00a0/g, ' '));
}

/** Instruction appended to generated-section prompts when the person is an ex-werknemer. */
export const EX_WERKNEMER_GENERATION_RULE =
  'Wanneer context.is_ex_werknemer true is: noem deze persoon "ex-werknemer" en deze opdrachtgever "ex-werkgever". Schrijf geen leesbaarheidsdisclaimer over die termen. Laat citaten tussen aanhalingstekens letterlijk.';

const PROTECTED_PHRASES = [
  'werknemersvaardigheden',
  'omdat een werknemer kan worden ingezet',
  'nieuwe werkgever',
  'potentiële werkgevers',
];

/** Generic workers in the control document use the parenthetical form. */
const GENERIC_PHRASES: Array<[RegExp, string]> = [
  [/\bveel werknemers\b/gi, 'veel (ex)werknemers'],
  [/\been werknemer kan zich\b/gi, 'een (ex)werknemer kan zich'],
  [/\bsoms is een werknemer\b/gi, 'soms is een (ex)werknemer'],
  [/\bwij helpen werknemers\b/gi, 'wij helpen (ex)werknemers'],
  [/\bvoor een werknemer niet mogelijk\b/gi, 'voor een (ex)werknemer niet mogelijk'],
  [/\bde werknemer te begeleiden\b/gi, 'de (ex)werknemer te begeleiden'],
  [/\bwanneer een werknemer moeite heeft\b/gi, 'wanneer een (ex)werknemer moeite heeft'],
  [/\bparticipatie van werknemers\b/gi, 'participatie van (ex)werknemers'],
  [/\been werknemer te laten stijgen\b/gi, 'een (ex)werknemer te laten stijgen'],
];

const QUOTED_SPAN = /"[^"]*"|“[^”]*”/g;
const ROLE_WORD = /\b(werknemers|werknemer|werkgevers|werkgever)\b/gi;
const DISCLAIMER =
  /\s*\*?Werknemer is uit dienst bij [\s\S]*?Ditzelfde geldt voor "werkgever" en "ex-werkgever"\./g;

function protectSpans(text: string, pattern: RegExp, slots: string[]): string {
  return text.replace(pattern, (match) => {
    const token = `\u0000${slots.length}\u0000`;
    slots.push(match);
    return token;
  });
}

function restoreSpans(text: string, slots: string[]): string {
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => slots[Number(index)] ?? '');
}

function matchCaseOf(source: string, replacement: string): string {
  if (!source || !replacement) return replacement;
  const sourceIsUpper = source[0] !== source[0].toLowerCase();
  const replacementIsUpper = replacement[0] !== replacement[0].toLowerCase();
  if (sourceIsUpper && !replacementIsUpper) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  if (!sourceIsUpper && replacementIsUpper) {
    return replacement[0].toLowerCase() + replacement.slice(1);
  }
  return replacement;
}

function toExForm(word: string): string {
  const prefix = word[0] !== word[0].toLowerCase() ? 'Ex-' : 'ex-';
  return prefix + word.toLowerCase();
}

/**
 * Control-document wording for the trajectplan preview.
 * Stored text stays in the normal form; call this only while rendering.
 */
export function applyExWerknemerWording(text: string, isEx: boolean): string {
  if (!isEx || !text) return text;

  const slots: string[] = [];
  let next = protectSpans(text, QUOTED_SPAN, slots);
  for (const phrase of PROTECTED_PHRASES) {
    next = protectSpans(next, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), slots);
  }
  for (const [pattern, replacement] of GENERIC_PHRASES) {
    next = next.replace(pattern, (match) => matchCaseOf(match, replacement));
  }
  next = next.replace(ROLE_WORD, (match, _word, offset, whole) => {
    const before = String(whole).slice(Math.max(0, offset - 4), offset).toLowerCase();
    if (before.endsWith('ex-') || before.endsWith('(ex)')) return match;
    return toExForm(match);
  });
  return restoreSpans(next, slots);
}

/** Drop the old readability footnote from a saved inleiding. */
export function stripInleidingExWerknemerDisclaimer(text: string): string {
  if (!text) return text;
  return text.replace(DISCLAIMER, '').replace(/[ \t]+\n/g, '\n').trimEnd();
}

/** Saved inleiding: remove the old footnote, then apply the control-document wording. */
export function displayInleidingText(text: string, isEx: boolean): string {
  return applyExWerknemerWording(stripInleidingExWerknemerDisclaimer(text), isEx);
}

/**
 * Rewrite the lead of a citation block and leave the text after the first marker unchanged.
 */
export function applyExWerknemerWordingBeforeMarker(
  text: string,
  isEx: boolean,
  markers: string[]
): string {
  if (!isEx || !text) return text;
  let cut = -1;
  let marker = '';
  for (const candidate of markers) {
    const index = text.indexOf(candidate);
    if (index >= 0 && (cut < 0 || index < cut)) {
      cut = index;
      marker = candidate;
    }
  }
  if (cut < 0) return applyExWerknemerWording(text, true);
  const headEnd = cut + marker.length;
  return applyExWerknemerWording(text.slice(0, headEnd), true) + text.slice(headEnd);
}
