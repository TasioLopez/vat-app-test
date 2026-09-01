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
