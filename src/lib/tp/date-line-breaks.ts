import { formatNLDate } from '@/lib/tp2026/schema';

const DUTCH_MONTHS =
  'januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december';

/** Matches "1 juni 2026" and "juni 2026". */
const DUTCH_DATE_RE = new RegExp(
  `\\b(\\d{1,2}\\s+(?:${DUTCH_MONTHS})\\s+\\d{4}|(?:${DUTCH_MONTHS})\\s+\\d{4})\\b`,
  'gi'
);

/** Replace spaces inside Dutch long-form dates with non-breaking spaces. */
export function protectDutchDatesInText(text: string): string {
  return text.replace(DUTCH_DATE_RE, (match) => match.replace(/ /g, '\u00A0'));
}

/** formatNLDate for A4 preview/print only — keeps dates on one line. */
export function formatNLDateForDoc(input?: string | null): string {
  const formatted = formatNLDate(input);
  return formatted === '—' ? formatted : protectDutchDatesInText(formatted);
}
