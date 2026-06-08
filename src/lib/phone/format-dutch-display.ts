/** Strip to national digits; +31 / 0031 → leading 0. */
export function toNationalDigits(raw: string): string {
  let s = raw.trim();
  if (!s) return '';

  if (s.startsWith('+31')) {
    s = `0${s.slice(3).replace(/\D/g, '')}`;
  } else if (s.startsWith('0031')) {
    s = `0${s.slice(4).replace(/\D/g, '')}`;
  } else {
    s = s.replace(/\D/g, '');
  }

  return s;
}

/**
 * Dutch display format: first 2 digits, dash, then pairs of 2 separated by spaces.
 * e.g. 0612345678 → 06-12 34 56 78
 */
export function formatDutchPhoneDisplay(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const digits = toNationalDigits(trimmed);
  if (digits.length < 9 || !digits.startsWith('0')) {
    return trimmed;
  }

  const head = digits.slice(0, 2);
  const tail = digits.slice(2);
  const pairs: string[] = [];
  for (let i = 0; i < tail.length; i += 2) {
    pairs.push(tail.slice(i, i + 2));
  }

  return `${head}-${pairs.join(' ')}`;
}
