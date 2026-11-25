/**
 * Deterministic quote / activity honesty helpers for VGR AI apply path (Phase 1).
 * Refuse empty or invented quotes; preserve exact source wording (T05).
 */
import type { VGRQuoteBlock } from '@/lib/vgr/schema';
import { emptyQuote } from '@/lib/vgr/schema';

const PLACEHOLDER_RE =
  /^(lorem ipsum|voorbeeldcitaat|\[citaat\]|TODO|n\.?\s*v\.?\s*t\.?|invullen|plaats hier|xxx+)$/i;

/** Looks like a fabricated / template quote rather than a source excerpt. */
export function looksInventedQuote(citaat: string): boolean {
  const t = citaat.trim();
  if (!t) return false;
  if (PLACEHOLDER_RE.test(t)) return true;
  if (/^\[[^\]]+\]$/.test(t)) return true;
  if (/\b(verzin|placeholder|voorbeeldtekst|sjabloon)\b/i.test(t)) return true;
  return false;
}

/** AD / arbeidsdeskundige markers — not a valid lead source for benutbare mogelijkheden. */
export function isAdLeadSource(bronType: string, bronNaam = ''): boolean {
  const blob = `${bronType} ${bronNaam}`.toLowerCase();
  return /\b(ad[\s_-]?rapport(?:age)?|arbeids\s*deskundig\w*)\b/.test(blob);
}

export type QuoteSanitizeResult = {
  quote: VGRQuoteBlock;
  refused: boolean;
  reason?: string;
};

/**
 * Prepare a quote block for Overnemen.
 * - Empty citaat → empty block (refuse partial metadata-only quotes).
 * - Invented / placeholder citaat → refuse.
 * - When `requireMedicalLead`: refuse AD-as-lead sources for benutbare mogelijkheden (G4).
 * Does not "correct" spelling or punctuation (T05).
 */
export function sanitizeQuoteForApply(
  raw: Partial<VGRQuoteBlock> | null | undefined,
  opts: { requireMedicalLead?: boolean } = {},
): QuoteSanitizeResult {
  const citaat = String(raw?.citaat ?? '').trim();
  const bron_naam = String(raw?.bron_naam ?? '').trim();
  const bron_datum = String(raw?.bron_datum ?? '').trim();
  const bron_type = String(raw?.bron_type ?? '').trim();

  if (!citaat) {
    return { quote: emptyQuote(), refused: Boolean(bron_naam || bron_datum || bron_type), reason: 'leeg_citaat' };
  }
  if (looksInventedQuote(citaat)) {
    return { quote: emptyQuote(), refused: true, reason: 'verzonnen_citaat' };
  }
  if (opts.requireMedicalLead && isAdLeadSource(bron_type, bron_naam)) {
    return {
      quote: emptyQuote(),
      refused: true,
      reason: 'ad_geen_medische_bron_voor_benutbare_mogelijkheden',
    };
  }
  return {
    quote: { citaat, bron_naam, bron_datum, bron_type },
    refused: false,
  };
}

/**
 * Activity-status honesty: detect wording that claims executed/sent when only planned/draft.
 * Used for regression (T06/T13) and apply notes — not a full NLP classifier.
 */
export function detectOverstatedActivityStatus(text: string): string[] {
  const t = text.toLowerCase();
  const issues: string[] = [];
  if (/\bmotivatiebrief\b/.test(t) && /\bverzonden\b/.test(t) && !/\b(niet|geen|zonder)\s+verzonden\b/.test(t)) {
    if (!/\bverzend(bewijs|mail|bevestiging)\b/.test(t)) {
      issues.push('motivatiebrief_als_verzonden_zonder_bewijs');
    }
  }
  if (/\b(is|zijn|werd|werden)\s+(uitgevoerd|afgerond|voltooid)\b/.test(t) && /\bgepland\b/.test(t)) {
    issues.push('gepland_als_uitgevoerd');
  }
  if (/\bmeegelopen\b/.test(t) && /\bverzoek\b/.test(t) && !/\bniet\s+meegelopen\b/.test(t)) {
    issues.push('meeloopverzoek_als_meegelopen');
  }
  return issues;
}

/** True when prose claims tests or applications that should stay empty for honesty (T01). */
export function detectInventedTestsOrApplications(text: string, opts: { allowTests: boolean; allowApps: boolean }): string[] {
  const t = text.toLowerCase();
  const issues: string[] = [];
  if (!opts.allowTests && /\b(persoonlijkheidstest|beroepskeuzetest|competentietest|drijfverentest)\b/.test(t) && /\b(afgenomen|uitgevoerd|gescoord)\b/.test(t)) {
    issues.push('fictieve_test');
  }
  if (!opts.allowApps && /\b(gesolliciteerd|sollicitatie\s+verzonden|open\s+sollicitatie)\b/.test(t)) {
    issues.push('fictieve_sollicitatie');
  }
  return issues;
}
