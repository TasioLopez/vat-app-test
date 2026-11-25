import type { VgrQuoteVerification } from './types';

/**
 * Deterministic quote check (pack §2 after EXTRACT): excerpt must appear in source text.
 * Preserves exact match including typos (T05) — no fuzzy "fix".
 */
export function verifyQuoteInSource(
  quote: string,
  sourceText: string,
): VgrQuoteVerification {
  const q = quote.trim();
  if (!q) return 'not_a_quote';
  if (!sourceText) return 'unverified';
  if (sourceText.includes(q)) return 'exact_verified';
  // Normalize only whitespace runs for a secondary check — never alter spelling.
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  if (norm(sourceText).includes(norm(q))) return 'exact_verified';
  return 'unverified';
}
