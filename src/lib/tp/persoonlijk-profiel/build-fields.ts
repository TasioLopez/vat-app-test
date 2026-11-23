import { getComputerSkillsLabel } from '@/lib/tp2026/gegevens-field-options';
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

function joinNl(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} en ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

function listFromFact(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function transportPhrase(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key === 'auto') return 'de auto';
  if (key === 'fiets') return 'de fiets';
  if (key === 'ov') return 'het openbaar vervoer';
  if (key === 'lopend') return 'te voet';
  return raw.trim();
}

const COMPUTER_LEVEL_ADJECTIVES: Record<string, string> = {
  geen: '',
  basis: 'basis',
  gemiddeld: 'gemiddelde',
  geavanceerd: 'geavanceerde',
  expert: 'expert',
};

const TYPING_ADJECTIVES: Record<string, string> = {
  goed: 'goede',
  'goed genoeg': 'goede',
  matig: 'matige',
  redelijk: 'redelijke',
  uitstekend: 'uitstekende',
  'zeer goed': 'uitstekende',
  voldoende: 'voldoende',
  basis: 'basis',
};

function computerLevelAdjective(raw: string): { recognized: boolean; adjective: string } {
  const text = raw.trim();
  if (!text) return { recognized: false, adjective: '' };
  const numberKey = text.split(' - ')[0]?.trim() ?? '';
  const fromOption = getComputerSkillsLabel(numberKey) || getComputerSkillsLabel(text);
  const label = (
    fromOption || (text.includes(' - ') ? text.split(' - ').slice(1).join(' - ') : text)
  )
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(COMPUTER_LEVEL_ADJECTIVES, label)) {
    return { recognized: true, adjective: COMPUTER_LEVEL_ADJECTIVES[label] };
  }
  return { recognized: false, adjective: '' };
}

function typingAdjective(raw: string): string {
  const text = raw.trim().toLowerCase();
  if (!text) return '';
  if (Object.prototype.hasOwnProperty.call(TYPING_ADJECTIVES, text)) return TYPING_ADJECTIVES[text];
  return text;
}

function programPhrase(raw: string): string {
  const parts = raw
    .split(/\s*,\s*|\s+en\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return joinNl(parts);
}

function movementPhrase(phrases: string[]): string {
  if (phrases.length === 1 && phrases[0] === 'te voet') return 'te voet';
  return `met ${joinNl(phrases)}`;
}

function mobilitySentence(facts: PersoonlijkProfileFacts): string[] {
  const licenses = listFromFact(facts.rijbewijs);
  const transport = listFromFact(facts.vervoer).map(transportPhrase);
  const sentences: string[] = [];
  const move = transport.length > 0 ? movementPhrase(transport) : '';

  if (licenses.length > 0 && move) {
    sentences.push(
      `Werknemer beschikt over rijbewijs ${licenses.join(', ')} en verplaatst zich ${move}.`
    );
    return sentences;
  }
  if (licenses.length > 0) {
    sentences.push(`Werknemer beschikt over rijbewijs ${licenses.join(', ')}.`);
  } else if (facts.rijbewijs === false) {
    sentences.push('Werknemer beschikt niet over een rijbewijs.');
  }
  if (move) {
    sentences.push(`Werknemer verplaatst zich ${move}.`);
  }
  return sentences;
}

function dutchSentence(facts: PersoonlijkProfileFacts): string[] {
  const skills: { name: string; level: string }[] = [
    ['spreken', facts.nederlands_spreken],
    ['lezen', facts.nederlands_lezen],
    ['schrijven', facts.nederlands_schrijven],
  ]
    .map(([name, value]) => ({ name, level: String(value ?? '').trim().toLowerCase() }))
    .filter((skill) => skill.level);

  const rated = skills.filter((skill) => skill.level !== 'geen');
  const absent = skills.filter((skill) => skill.level === 'geen');
  const sentences: string[] = [];

  if (rated.length > 0) {
    const groups: { level: string; names: string[] }[] = [];
    for (const skill of rated) {
      const group = groups.find((item) => item.level === skill.level);
      if (group) group.names.push(skill.name);
      else groups.push({ level: skill.level, names: [skill.name] });
    }
    const clauses = groups.map((group) => `${group.level} in ${joinNl(group.names)}`);
    sentences.push(`De Nederlandse taal beheerst werknemer ${clauses.join(' en ')}.`);
  }

  for (const skill of absent) {
    const label = skill.name.charAt(0).toUpperCase() + skill.name.slice(1);
    sentences.push(`${label} beheerst werknemer niet.`);
  }
  return sentences;
}

const OTHER_LANGUAGE_SUBJECT: Record<string, string> = {
  berbers: 'De Berberse taal',
  engels: 'Het Engels',
  arabisch: 'Het Arabisch',
  turks: 'De Turkse taal',
  duits: 'De Duitse taal',
  frans: 'De Franse taal',
  spaans: 'De Spaanse taal',
};

function otherLanguageSentences(raw: string): string[] {
  return raw
    .split(/\s*;\s*|\n+/)
    .map((part) => part.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(/^(\S+)\s+(.+)$/);
      if (!match) {
        const sentence = chunk.endsWith('.') ? chunk : `${chunk}.`;
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
      }
      const name = match[1];
      const level = joinNl(match[2].split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean));
      const subject = OTHER_LANGUAGE_SUBJECT[name.toLowerCase()] ?? `Het ${name}`;
      return `${subject} beheerst werknemer ${level}.`;
    });
}

function computerSentence(facts: PersoonlijkProfileFacts): string | null {
  const computer = String(facts.computervaardigheden ?? '').trim();
  const extra = String(facts.computervaardigheden_toelichting ?? '').trim();
  const level = computerLevelAdjective(computer);
  const programs = programPhrase(extra);
  let skillCore = '';
  if (level.recognized && level.adjective && programs) {
    skillCore = `${level.adjective} computervaardigheden met ${programs}`;
  } else if (level.recognized && level.adjective) {
    skillCore = `${level.adjective} computervaardigheden`;
  } else if (programs) {
    skillCore = `computervaardigheden met ${programs}`;
  } else if (!level.recognized && computer) {
    skillCore = computer.toLowerCase().includes('computer')
      ? computer
      : `computervaardigheden (${computer})`;
  }

  const typing = typingAdjective(String(facts.typvaardigheid ?? ''));
  const pc = facts.has_pc === true;
  const typingClause = typing ? `${typing} typvaardigheden` : '';

  if (pc && skillCore && typingClause) {
    return `Werknemer beschikt over een pc of laptop, heeft ${skillCore} en beschikt over ${typingClause}.`;
  }
  if (pc && skillCore) {
    return `Werknemer beschikt over een pc of laptop en heeft ${skillCore}.`;
  }
  if (pc && typingClause) {
    return `Werknemer beschikt over een pc of laptop en over ${typingClause}.`;
  }
  if (pc) return 'Werknemer beschikt over een pc of laptop.';
  if (skillCore && typingClause) {
    return `Werknemer beschikt over ${skillCore} en over ${typingClause}.`;
  }
  if (skillCore) return `Werknemer beschikt over ${skillCore}.`;
  if (typingClause) return `Werknemer beschikt over ${typingClause}.`;
  return null;
}

/**
 * Deterministic alinea_2 sentences from structured intake profile_facts.
 * Only emits clauses for facts that are present, written as report sentences.
 */
export function assembleAlinea2FromProfileFacts(facts: PersoonlijkProfileFacts): string {
  const otherLang = String(facts.andere_talen ?? '').trim();
  const computer = computerSentence(facts);
  return joinSentences([
    ...mobilitySentence(facts),
    ...dutchSentence(facts),
    ...(otherLang ? otherLanguageSentences(otherLang) : []),
    ...(computer ? [computer] : []),
  ]);
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
