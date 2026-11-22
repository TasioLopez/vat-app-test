import {
  BANNED_PHRASES,
  CHRONOLOGY_SENTENCE_PATTERN,
  MISSING_INFO_PATTERN,
  OPENING_PREFIX,
  PC_LAPTOP_PATTERN,
  SECTION_HEADING_PATTERN,
  SMARTPHONE_PATTERN,
  SOFT_TRAIT_SENTENCE_PATTERN,
  SOURCE_REFERENCE_PATTERN,
} from './constants';
import type { PersoonlijkProfielContentResult } from './schema';

export type PersoonlijkProfielBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  details: { gender?: string | null; date_of_birth?: string | null };
};

export type PersoonlijkProfielFields = {
  persoonlijk_profiel: string;
};

export type PersoonlijkProfileFacts = Record<string, unknown>;

export function calculateAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function joinSentences(sentences: string[]): string {
  if (sentences.length === 0) return '';
  return sentences.join(' ').replace(/\s{2,}/g, ' ').trim();
}

export function stripSourceReferenceSentences(text: string): string {
  if (!text) return text;
  const kept = splitSentences(text).filter(
    (sentence) =>
      !SOURCE_REFERENCE_PATTERN.test(sentence) && !MISSING_INFO_PATTERN.test(sentence)
  );
  return joinSentences(kept);
}

/** Drop sentences that narrate chronological work timelines. */
export function stripChronologySentences(text: string): string {
  if (!text) return text;
  return joinSentences(splitSentences(text).filter((s) => !CHRONOLOGY_SENTENCE_PATTERN.test(s)));
}

/** Drop soft judgment / motivation / personality remarks. */
export function stripSoftTraitSentences(text: string): string {
  if (!text) return text;
  return joinSentences(splitSentences(text).filter((s) => !SOFT_TRAIT_SENTENCE_PATTERN.test(s)));
}

/**
 * Remove smartphone mentions when a PC/laptop is also mentioned in the same text.
 * If there is no PC/laptop, smartphone is kept (fallback device rule).
 */
export function stripSmartphoneWhenPcPresent(text: string): string {
  if (!text || !PC_LAPTOP_PATTERN.test(text) || !SMARTPHONE_PATTERN.test(text)) {
    return text;
  }

  const kept = splitSentences(text)
    .map((sentence) => {
      if (!SMARTPHONE_PATTERN.test(sentence)) return sentence;
      // Drop whole sentence if it is mainly about smartphone
      if (/maakt\s+gebruik\s+van\s+(een\s+)?smartphone/i.test(sentence) && !PC_LAPTOP_PATTERN.test(sentence)) {
        return '';
      }
      // Otherwise strip smartphone clause fragments from a mixed sentence
      let cleaned = sentence
        .replace(/,?\s*maakt\s+gebruik\s+van\s+(een\s+)?smartphone\b/gi, '')
        .replace(/,?\s*beschikt\s+over\s+(een\s+)?smartphone\b/gi, '')
        .replace(/,?\s*(een\s+)?smartphone\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+,/g, ',')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*\./g, '.')
        .replace(/\s+\./g, '.')
        .trim();
      return cleaned;
    })
    .filter((s) => s.length > 0);

  return joinSentences(kept);
}

/** Rewrite unnatural typvaardigheid phrasing to a natural clause. */
export function rewriteTypvaardigheidPhrasing(text: string): string {
  if (!text) return text;
  return text
    .replace(
      /typvaardigheid\s+die\s+als\s+[^.]*?(?:goed\s+genoeg|aangeduid)[^.]*?\./gi,
      'Werknemer beschikt over goede typvaardigheden.'
    )
    .replace(/\bgoed\s+genoeg\s+is\s+aangeduid\b/gi, 'goed')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Deterministic alinea_2 sentences from structured intake profile_facts.
 * Only emits clauses for facts that are present.
 */
export function assembleAlinea2FromProfileFacts(facts: PersoonlijkProfileFacts): string {
  const sentences: string[] = [];

  const licenses = Array.isArray(facts.rijbewijs)
    ? (facts.rijbewijs as unknown[]).map((v) => String(v).trim()).filter(Boolean)
    : typeof facts.rijbewijs === 'string' && facts.rijbewijs.trim()
      ? [facts.rijbewijs.trim()]
      : [];
  const transport = Array.isArray(facts.vervoer)
    ? (facts.vervoer as unknown[]).map((v) => String(v).trim()).filter(Boolean)
    : typeof facts.vervoer === 'string' && facts.vervoer.trim()
      ? [facts.vervoer.trim()]
      : [];

  if (licenses.length > 0) {
    sentences.push(`Werknemer beschikt over rijbewijs ${licenses.join(', ')}.`);
  } else if (licenses.length === 0 && facts.rijbewijs === false) {
    sentences.push('Werknemer beschikt niet over een rijbewijs.');
  }

  if (transport.length > 0) {
    const joined =
      transport.length === 1
        ? transport[0]
        : `${transport.slice(0, -1).join(', ')} en ${transport[transport.length - 1]}`;
    sentences.push(`Werknemer verplaatst zich met ${joined}.`);
  }

  const nlParts: string[] = [];
  const spreken = String(facts.nederlands_spreken ?? '').trim();
  const schrijven = String(facts.nederlands_schrijven ?? '').trim();
  const lezen = String(facts.nederlands_lezen ?? '').trim();
  if (spreken) nlParts.push(`spreken ${spreken.toLowerCase()}`);
  if (lezen) nlParts.push(`lezen ${lezen.toLowerCase()}`);
  if (schrijven) nlParts.push(`schrijven ${schrijven.toLowerCase()}`);
  if (nlParts.length > 0) {
    sentences.push(
      `De Nederlandse taal beheerst werknemer ${nlParts.join(', ').replace(/, ([^,]*)$/, ' en $1')}.`
    );
  }

  const otherLang = String(facts.andere_talen ?? '').trim();
  if (otherLang) {
    sentences.push(`Andere talen: ${otherLang}.`);
  }

  const computer = String(facts.computervaardigheden ?? '').trim();
  const computerExtra = String(facts.computervaardigheden_toelichting ?? '').trim();
  if (computer || computerExtra) {
    const skill = computerExtra || computer;
    sentences.push(
      `Werknemer beschikt over ${skill.toLowerCase().includes('computer') ? skill : `computervaardigheden (${skill})`}.`
    );
  }

  if (facts.has_pc === true) {
    sentences.push('Werknemer beschikt over een pc of laptop.');
  }

  const typing = String(facts.typvaardigheid ?? '').trim();
  if (typing) {
    const lower = typing.toLowerCase();
    const adjective =
      lower === 'goed'
        ? 'goede'
        : lower === 'matig'
          ? 'matige'
          : lower === 'redelijk'
            ? 'redelijke'
            : lower === 'uitstekend'
              ? 'uitstekende'
              : /goed|matig|redelijk|uitstekend/i.test(typing)
                ? `${lower}e`
                : 'goede';
    sentences.push(`Werknemer beschikt over ${adjective} typvaardigheden.`);
  }

  return joinSentences(sentences);
}

export function sanitizeFragment(text: string): string {
  let cleaned = stripCitations(text);
  cleaned = rewriteTypvaardigheidPhrasing(cleaned);
  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(re, '');
  }
  cleaned = stripSourceReferenceSentences(cleaned);
  cleaned = stripChronologySentences(cleaned);
  cleaned = stripSoftTraitSentences(cleaned);
  cleaned = stripSmartphoneWhenPcPresent(cleaned);
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

function sanitizeParagraph(text: string): string {
  return sanitizeFragment(text).replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function stripSectionHeading(text: string): string {
  return text.replace(SECTION_HEADING_PATTERN, '').trim();
}

export function hasValidOpening(alinea1: string): boolean {
  return alinea1.trimStart().startsWith(OPENING_PREFIX);
}

export function buildPersoonlijkProfielFields(
  _ctx: PersoonlijkProfielBuildContext,
  content: PersoonlijkProfielContentResult,
  profileFacts?: PersoonlijkProfileFacts | null
): PersoonlijkProfielFields {
  // Alinea 3 is never autofilled (judgment/personal); always discarded.
  const factsAlinea2 = profileFacts ? assembleAlinea2FromProfileFacts(profileFacts) : '';
  const modelAlinea2 = content.alinea_2
    ? stripSectionHeading(sanitizeParagraph(content.alinea_2))
    : '';

  // Prefer deterministic facts when present; otherwise keep model alinea_2.
  const alinea2 = factsAlinea2 || modelAlinea2 || null;

  const paragraphs = [content.alinea_1, alinea2]
    .map((part) => (part ? stripSectionHeading(sanitizeParagraph(part)) : null))
    .filter((part): part is string => Boolean(part));

  if (paragraphs.length > 0 && !hasValidOpening(paragraphs[0])) {
    console.warn('⚠️ Persoonlijk profiel: alinea_1 missing mandatory opening sentence');
  }

  return { persoonlijk_profiel: paragraphs.join('\n\n') };
}
