/**
 * Strip leaked intake form field labels from verbatim quote extractions.
 * Handles missing space after ":" and duplicated labels.
 */

const LEADING_QUOTE_LABELS = [
  /^Quote advies spoor 2(?:\s*\(inleiding\))?\s*:\s*/i,
  /^Quote passende functies\s*:\s*/i,
];

export function stripLeadingIntakeQuoteLabels(text: string): string {
  if (!text) return text;

  let result = text;
  let stripped = false;
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of LEADING_QUOTE_LABELS) {
      const next = result.replace(pattern, '');
      if (next !== result) {
        result = next.replace(/^\s+/, '');
        changed = true;
        stripped = true;
      }
    }
  }

  // Trim only after removing a label; preserve typing spaces on clean quotes.
  return stripped ? result.trim() : result;
}
