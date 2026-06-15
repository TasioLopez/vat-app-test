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

function formatDigitPairs(digits: string): string {
  const pairs: string[] = [];
  for (let i = 0; i < digits.length; i += 2) {
    pairs.push(digits.slice(i, i + 2));
  }
  return pairs.join(' ');
}

function formatDutchNationalDigits(digits: string): string | undefined {
  if (digits.length < 9 || !digits.startsWith('0')) {
    return undefined;
  }
  const head = digits.slice(0, 2);
  const tail = digits.slice(2);
  return `${head} - ${formatDigitPairs(tail)}`;
}

/** Country calling code length: 1 for +1, 2 for most regions, 3 for a few. */
function countryCallingCodeLength(digits: string): number {
  if (digits.startsWith('1')) return 1;
  if (digits.startsWith('7')) return 1;
  const threeDigitPrefixes = ['350', '351', '352', '353', '354', '355', '356', '357', '358', '359', '370', '371', '372', '373', '374', '375', '376', '377', '378', '379', '380', '381', '382', '383', '385', '386', '387', '389', '420', '421', '423'];
  if (threeDigitPrefixes.some((p) => digits.startsWith(p))) return 3;
  return 2;
}

function formatInternationalPhone(trimmed: string): string | undefined {
  if (!trimmed.startsWith('+')) return undefined;

  const digits = trimmed.slice(1).replace(/\D/g, '');
  if (digits.length < 9) return undefined;

  const ccLen = countryCallingCodeLength(digits);
  const cc = digits.slice(0, ccLen);
  const national = digits.slice(ccLen);
  if (national.length < 6) return undefined;

  return `+${cc} - ${formatDigitPairs(national)}`;
}

/**
 * Phone display format with spaced dash.
 * Dutch: 0612345678 → 06 - 12 34 56 78
 * International: +33686999710 → +33 - 68 69 99 71 0
 */
export function formatDutchPhoneDisplay(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const dutchFormatted = formatDutchNationalDigits(toNationalDigits(trimmed));
  if (dutchFormatted) return dutchFormatted;

  const internationalFormatted = formatInternationalPhone(trimmed);
  if (internationalFormatted) return internationalFormatted;

  return trimmed;
}

/** Normalize phone for DB storage; empty → null. */
export function normalizePhoneForStorage(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return formatDutchPhoneDisplay(raw.trim()) ?? raw.trim();
}

/** Format phone for UI display; empty → em dash. */
export function formatPhoneForDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return '—';
  return formatDutchPhoneDisplay(raw) ?? raw.trim();
}
