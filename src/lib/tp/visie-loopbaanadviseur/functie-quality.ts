import { parseAdAdvies } from '@/lib/tp/ad-advies/build-fields';
import { EN_SOORTGELIJK, TOELICHTING_CLONE_PHRASES } from './constants';
import type { VisieLoopbaanadviseurContentResult } from './schema';

const FUNCTIE_STOPWORDS = new Set([
  'medewerker',
  'en',
  'van',
  'de',
  'het',
  'een',
  'ondersteunend',
  'ondersteuning',
  'interne',
  'intern',
  'zakelijke',
  'dienstverlening',
]);

const AD_PLACEHOLDER_PATTERN =
  /^(n\.?\s*b\.?|geen\s+ad|nog\s+geen\s+ad|tijdens het opstellen)/i;

export type FunctieQualityResult = {
  ok: boolean;
  issues: string[];
};

export function normalizeFunctieNaam(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function significantTokens(name: string): string[] {
  const normalized = normalizeFunctieNaam(name);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !FUNCTIE_STOPWORDS.has(t));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function phrasesOverlap(a: string, b: string): boolean {
  const normA = normalizeFunctieNaam(a);
  const normB = normalizeFunctieNaam(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = significantTokens(a);
  const tokensB = significantTokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const score = jaccard(tokensA, tokensB);
  if (score >= 0.5) return true;

  const shared = tokensA.filter((t) => tokensB.includes(t));
  return shared.length >= 2 && score >= 0.4;
}

/**
 * Extract AD function titles/phrases for exclusion from advies_ad_passende_arbeid.
 */
export function extractAdExclusionPhrases(
  adviesAd: string | null | undefined
): string[] {
  const raw = String(adviesAd || '').trim();
  if (!raw) return [];

  const parsed = parseAdAdvies(raw);
  const body = (parsed.citaat || parsed.intro || raw).trim();
  if (!body) return [];
  if (AD_PLACEHOLDER_PATTERN.test(body)) return [];

  const phrases: string[] = [];
  const seen = new Set<string>();

  const addPhrase = (phrase: string) => {
    const cleaned = phrase
      .replace(/^\*+\s*/, '')
      .replace(/\*+/g, '')
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 4 || cleaned.length > 120) return;
    if (AD_PLACEHOLDER_PATTERN.test(cleaned)) return;
    const key = normalizeFunctieNaam(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    phrases.push(cleaned);
  };

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bullet = trimmed.match(/^(?:[•\-–—*]|(\d+[\.)]))\s*(.+)$/);
    if (bullet) {
      const item = (bullet[2] || trimmed).split(/[:–—-]/)[0]?.trim() || '';
      if (item) addPhrase(item);
      continue;
    }

    // Bold-ish or Title Case short lines that look like job titles.
    if (
      trimmed.length <= 80 &&
      !/[.!?]$/.test(trimmed) &&
      /[A-ZÀ-ÖØ-Ý]/.test(trimmed) &&
      !/^(ik|de\s+arbeids|conform|naast)/i.test(trimmed)
    ) {
      addPhrase(trimmed.split(/[:–—]/)[0]?.trim() || trimmed);
    }
  }

  // Fallback: capture "zoals: A, B en C" style lists.
  if (phrases.length === 0) {
    const zoals = body.match(/zoals[:\s]+(.+)/i);
    if (zoals?.[1]) {
      for (const part of zoals[1].split(/,| en |;/)) {
        addPhrase(part.replace(/\.$/, '').trim());
      }
    }
  }

  return phrases;
}

function titlesTooSimilar(a: string, b: string): boolean {
  const tokensA = significantTokens(a);
  const tokensB = significantTokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const score = jaccard(tokensA, tokensB);
  if (score >= 0.45) return true;

  const shared = tokensA.filter((t) => tokensB.includes(t));
  return shared.length >= 2;
}

function toelichtingCloneFamilies(toelichtingen: string[]): string[] {
  const hits: string[] = [];
  for (const phrase of TOELICHTING_CLONE_PHRASES) {
    const matching = toelichtingen.filter((t) =>
      t.toLowerCase().includes(phrase.toLowerCase())
    );
    if (matching.length >= 2) hits.push(phrase);
  }
  return hits;
}

export function assessFunctieQuality(
  content: VisieLoopbaanadviseurContentResult,
  adExclusionPhrases: string[]
): FunctieQualityResult {
  const issues: string[] = [];
  const concrete = content.functies
    .slice(0, 3)
    .filter((f) => f.naam.trim().toLowerCase() !== EN_SOORTGELIJK.toLowerCase());

  for (const f of concrete) {
    for (const excluded of adExclusionPhrases) {
      if (phrasesOverlap(f.naam, excluded)) {
        issues.push(
          `AD-overlap: "${f.naam}" lijkt te veel op AD-titel "${excluded}"`
        );
        break;
      }
    }
  }

  for (let i = 0; i < concrete.length; i++) {
    for (let j = i + 1; j < concrete.length; j++) {
      if (titlesTooSimilar(concrete[i].naam, concrete[j].naam)) {
        issues.push(
          `Onderling te gelijk: "${concrete[i].naam}" en "${concrete[j].naam}"`
        );
      }
    }
  }

  const cloneHits = toelichtingCloneFamilies(
    concrete.map((f) => f.toelichting || '')
  );
  if (cloneHits.length > 0) {
    issues.push(
      `Toelichtingen te gelijk (herhaalde formulering: ${cloneHits.join(', ')})`
    );
  }

  return { ok: issues.length === 0, issues };
}

export function buildRepairFeedbackMessage(
  issues: string[],
  rejectedNames: string[]
): string {
  const names = rejectedNames.filter(Boolean).join('; ');
  return [
    'REPARATIE — vorige functiesuggesties voldeden niet aan de kwaliteitseisen.',
    `Problemen: ${issues.join(' | ')}`,
    names ? `Afgewezen namen: ${names}` : '',
    'Lever opnieuw exact vier functies (drie concrete + "En soortgelijk").',
    'Eisen: drie duidelijk verschillende roltypen; geen AD-overlap/synoniemen; gevarieerde toelichtingen; blijf binnen zoekprofiel en belastbaarheid; geen onrealistische functies.',
  ]
    .filter(Boolean)
    .join('\n');
}
