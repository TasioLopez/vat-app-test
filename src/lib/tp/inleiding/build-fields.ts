import type { ReferentRow } from '@/lib/referents';
import { formatPersonShortName } from '@/lib/utils';
import {
  buildInleidingAdIntroPrefix,
  hasDefinitiveAdReport,
  isAdReportConcept,
} from '@/lib/tp/ad-report-wording';
import { stripLeadingIntakeQuoteLabels } from '@/lib/tp/strip-intake-quote-labels';
import {
  AD_INTRO_SUFFIX,
  AD_INTRO_SUFFIX_LEGACY,
  AD_INTRO_SUFFIX_PREVIOUS,
  INLEIDING_GEEN_AD,
  MEDISCHE_BEGELEIDING_ZINNEN,
  MEDISCHE_SITUATIE_OPENING,
  VALENTINEZ_DOEL_AFSLUITING,
  VALENTINEZ_DOEL_BASE,
} from './constants';
import type { InleidingContentResult } from './schema';

export type InleidingBuildContext = {
  employee: { first_name?: string | null; last_name?: string | null };
  details: {
    gender?: string | null;
    current_job?: string | null;
    contract_hours?: string | number | null;
    date_of_birth?: string | null;
  };
  meta: {
    intake_date?: string | null;
    first_sick_day?: string | null;
    has_ad_report?: boolean | null;
    ad_report_date?: string | null;
    ad_report_concept?: boolean | null;
    is_ex_werknemer?: boolean | null;
    occupational_doctor_name?: string | null;
    advies_ad_passende_arbeid?: string | null;
    /** Fallback when referents.referent_function is empty (TP Gegevens). */
    client_referent_function?: string | null;
    /** Fallback from validated intake s4. */
    intake_referent_function?: string | null;
  };
  client: { name?: string | null };
  referent: ReferentRow | null;
};

export type InleidingFields = {
  inleiding: string;
  inleiding_sub: string;
};

/** Coerce DB/model values (string | number | null) to trimmed text. */
export function coerceText(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback;
  return String(value).trim();
}

export function nlDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isMale(gender?: string | null): boolean {
  const g = (gender || '').toLowerCase();
  return g === 'male' || g === 'man' || g === 'm' || g === 'mannelijk';
}

function isFemale(gender?: string | null): boolean {
  const g = (gender || '').toLowerCase();
  return g === 'female' || g === 'vrouw' || g === 'f' || g === 'vrouwelijk';
}

function pronPoss(gender?: string | null): string {
  return isMale(gender) ? 'zijn' : 'haar';
}

function genderWord(gender?: string | null): string {
  return isMale(gender) ? 'man' : 'vrouw';
}

function heerMevrouw(gender?: string | null): string {
  return isMale(gender) ? 'de heer' : 'mevrouw';
}

function refTitle(gender?: string | null): string | null {
  if (isMale(gender)) return 'meneer';
  if (isFemale(gender)) return 'mevrouw';
  return null;
}

const HONORIFIC_PREFIX = /^(?:de\s+heer|mevrouw|meneer|dhr\.?|mevr\.?)\s+/i;

function stripHonorificPrefix(name: string): string {
  return name.replace(HONORIFIC_PREFIX, '').trim();
}

function withOptionalTitle(title: string | null, name: string): string {
  const cleaned = stripHonorificPrefix(name);
  return title ? `${title} ${cleaned}` : cleaned;
}

function getInitials(firstName?: string | null): string {
  if (!firstName) return '';
  return (
    firstName
      .split(' ')
      .map((n) => n[0]?.toUpperCase())
      .filter(Boolean)
      .join('. ') + '.'
  );
}

function getFirstInitial(firstName?: string | null): string {
  const first = String(firstName ?? '').trim();
  if (!first) return '';
  const ch = first[0]?.toUpperCase();
  return ch ? `${ch}.` : '';
}

function employeeShortName(ctx: InleidingBuildContext): string {
  const initial = getFirstInitial(ctx.employee.first_name);
  const lastName = coerceText(ctx.employee.last_name, '[achternaam]');
  return `${initial} ${lastName}`.trim();
}

function applyEmployeeNameConsistency(ctx: InleidingBuildContext, text: string): string {
  const first = String(ctx.employee.first_name ?? '').trim();
  const last = String(ctx.employee.last_name ?? '').trim();
  if (!first || !last) return text;

  const short = employeeShortName(ctx);
  const escapedFirst = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedLast = last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Replace "First Last" first, then remaining standalone First.
  return text
    .replace(new RegExp(`\\b${escapedFirst}\\s+${escapedLast}\\b`, 'gi'), short)
    .replace(new RegExp(`\\b${escapedFirst}\\b`, 'gi'), short);
}

function calculateAge(dateOfBirth?: string | null): number | null {
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

function applyGenderToMedischeText(text: string, gender?: string | null): string {
  const poss = pronPoss(gender);
  return text.replace(/zijn\/haar/g, poss);
}

function personNoun(_ctx: InleidingBuildContext, capitalized: boolean): string {
  // Always store normal form; Ex- wording is applied on preview/editor render.
  return capitalized ? 'Werknemer' : 'werknemer';
}

function buildGesprek(ctx: InleidingBuildContext): string {
  const lastName = coerceText(ctx.employee.last_name, '[achternaam]');
  const intakeDate = nlDate(ctx.meta.intake_date) || '[datum intake]';
  return `Ik heb ${heerMevrouw(ctx.details.gender)} ${lastName}, hierna ${personNoun(ctx, false)} te noemen, gesproken op ${intakeDate}.`;
}

function buildUitval(ctx: InleidingBuildContext): string {
  const age = calculateAge(ctx.details.date_of_birth);
  const agePart = age != null ? `${age}-jarige ` : '';
  const poss = pronPoss(ctx.details.gender);
  const job = coerceText(ctx.details.current_job, '[functie]').toLowerCase();
  const employer = coerceText(ctx.client.name, '[werkgever]');
  const sickDay = nlDate(ctx.meta.first_sick_day) || '[eerste ziektedag]';
  const hours = coerceText(ctx.details.contract_hours, '[uren]');
  return `${personNoun(ctx, true)} is een ${agePart}${genderWord(ctx.details.gender)} die als gevolg van medische beperkingen is uitgevallen sinds ${sickDay} voor ${poss} functie als ${job} bij ${employer}. De functie heeft een urenomvang van ${hours} uur per week.`;
}

function buildFunctieomschrijving(ctx: InleidingBuildContext, body: string): string {
  const trimmed = applyEmployeeNameConsistency(ctx, body.trim() || '...');
  return `**Functieomschrijving**\n${trimmed}`;
}

function normalizePersonKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/^(?:de\s+heer|mevrouw|meneer|dhr\.?|mevr\.?)\s+/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isDistinctExtraAanmelder(
  extra: { naam?: string | null },
  ref: { first_name?: string | null; last_name?: string | null } | null
): boolean {
  const extraName = normalizePersonKey(extra.naam || '');
  if (!extraName) return false;
  if (!ref) return true;
  const refName = normalizePersonKey(
    `${coerceText(ref.first_name)} ${coerceText(ref.last_name)}`.trim()
  );
  if (!refName) return true;
  if (extraName === refName) return false;
  const refLast = normalizePersonKey(coerceText(ref.last_name));
  if (refLast && (extraName === refLast || extraName.endsWith(` ${refLast}`))) {
    const extraFirst = extraName.replace(new RegExp(`\\s*${refLast}$`), '').trim();
    const refFirst = normalizePersonKey(coerceText(ref.first_name));
    if (!extraFirst || !refFirst) return false;
    if (extraFirst[0] === refFirst[0]) return false;
  }
  return true;
}

function splitPersonName(name: string): { first_name: string; last_name: string } {
  const cleaned = name.replace(/^(?:de\s+heer|mevrouw|meneer|dhr\.?|mevr\.?)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export type IntakeExtraReferentSource = {
  s4?: {
    extra_referent_name?: string | null;
    extra_referent_function?: string | null;
  } | null;
} | null;

/**
 * Intake sectie 4 is the only source for a second aanmelder.
 * An empty extra contactpersoon drops whatever the model copied from FML/AD.
 * When the extra contact is filled, that name and function win. Organisation and
 * gender stay from the model only when it named the same person.
 */
export function applyIntakeExtraAanmelder(
  content: InleidingContentResult,
  intake: IntakeExtraReferentSource | null | undefined,
  referent: ReferentRow | null,
  clientName: string
): InleidingContentResult {
  const extraName = coerceText(intake?.s4?.extra_referent_name);
  const extraFunction = coerceText(intake?.s4?.extra_referent_function);
  if (!extraName) {
    return { ...content, extra_aanmelder: null };
  }

  const fromIntake = {
    functie: extraFunction,
    naam: extraName,
    organisatie: coerceText(clientName),
    gender: null as 'Man' | 'Vrouw' | null,
  };
  if (!isDistinctExtraAanmelder(fromIntake, referent)) {
    return { ...content, extra_aanmelder: null };
  }

  const model = content.extra_aanmelder;
  const modelMatches = Boolean(
    model?.naam && !isDistinctExtraAanmelder(model, splitPersonName(extraName))
  );

  return {
    ...content,
    extra_aanmelder: {
      functie: extraFunction,
      naam: extraName,
      organisatie: modelMatches ? coerceText(model?.organisatie, clientName) : coerceText(clientName),
      gender: modelMatches ? model?.gender ?? null : null,
    },
  };
}

function buildAanmelding(ctx: InleidingBuildContext, content: InleidingContentResult): string {
  const companyName = coerceText(ctx.client.name, '[organisatie]');
  const ref = ctx.referent;
  const refInitials = getInitials(ref?.first_name);
  const refLastName = coerceText(ref?.last_name, '[naam aanmelder]');
  // Prefer referent row, then intake s4, then TP Gegevens — never invent "contactpersoon".
  const refFunction = coerceText(
    ref?.referent_function ||
      ctx.meta.intake_referent_function ||
      ctx.meta.client_referent_function
  );
  const referentTitle = refTitle(ref?.gender);
  const referentShort = formatPersonShortName(`${refInitials} ${refLastName}`.trim());

  const suffix =
    ' aangemeld met het verzoek een 2e spoor re-integratietraject op te starten in het kader van de Wet Verbetering Poortwachter.';

  const extra = content.extra_aanmelder;
  if (extra && isDistinctExtraAanmelder(extra, ref)) {
    const extraNaam = withOptionalTitle(
      refTitle(extra.gender),
      formatPersonShortName(extra.naam)
    );
    const referentNaam = withOptionalTitle(referentTitle, referentShort);
    const extraFunctie = coerceText(extra.functie);
    const extraOrg = coerceText(extra.organisatie, companyName);
    const extraLead = [extraNaam, extraFunctie, extraOrg ? `bij ${extraOrg}` : '']
      .filter(Boolean)
      .join(', ')
      .replace(/, bij /, ' bij ')
      .replace(/[.\s]+$/, '');
    const opdrachtRoleOrg = [refFunction, companyName].filter(Boolean).join(' ');
    const opdracht = opdrachtRoleOrg
      ? `${referentNaam}, ${opdrachtRoleOrg}`
      : referentNaam;
    return `Werknemer is door ${extraLead}. In opdracht van: ${opdracht}${suffix}`;
  }

  const refName = ref
    ? [refFunction, referentShort].filter(Boolean).join(' ').trim()
    : refLastName;
  return `Werknemer is door ${refName} namens ${companyName}${suffix}`;
}

function buildMedischeSituatie(ctx: InleidingBuildContext, content: InleidingContentResult): string {
  const opening = applyGenderToMedischeText(MEDISCHE_SITUATIE_OPENING, ctx.details.gender);
  if (content.medische_begeleiding === 'geen') {
    return opening;
  }
  const extra = MEDISCHE_BEGELEIDING_ZINNEN[content.medische_begeleiding];
  if (!extra) return opening;
  return `${opening} ${applyGenderToMedischeText(extra, ctx.details.gender)}`;
}

/**
 * Duration clause for spoor-1 hours.
 * Bare number → "8 uur per week"; schedule phrasing with uur/uren → keep as-is
 * (e.g. "3 x 2 uur per week") so we do not append a second "uur per week".
 */
export function formatReintegratieUrenDuration(raw: string): string {
  const uren = raw.trim();
  if (!uren) return '[uren] uur per week';
  if (/\buur(?:en)?\b/i.test(uren)) return uren;
  return `${uren} uur per week`;
}

function buildReintegratieEnDoel(ctx: InleidingBuildContext, content: InleidingContentResult): string {
  let reinteg: string;
  if (content.reintegreert_spoor1) {
    const duration = formatReintegratieUrenDuration(
      coerceText(content.reintegratie_uren, '')
    );
    const werkType = content.reintegratie_werk_type || 'eigen werk';
    reinteg = `Ten tijde van het intakegesprek re-integreert werknemer in spoor 1 gedurende ${duration} in ${werkType}.`;
  } else {
    reinteg = 'Ten tijde van het intakegesprek re-integreert werknemer niet in spoor 1.';
  }

  let doel = `${VALENTINEZ_DOEL_BASE} ${VALENTINEZ_DOEL_AFSLUITING}`;
  const doelToelichting = coerceText(content.werknemer_doel_toelichting);
  if (doelToelichting) {
    doel = `${VALENTINEZ_DOEL_BASE} ${doelToelichting} ${VALENTINEZ_DOEL_AFSLUITING}`;
  }

  return `${reinteg} ${doel}`;
}

export function buildAdSubBlock(
  adName: string,
  adDate: string,
  quote: string,
  concept = false
): string {
  const intro = `${buildInleidingAdIntroPrefix(concept)} opgesteld door ${adName} op ${adDate} ${AD_INTRO_SUFFIX}`;
  return buildInleidingSubBlock(intro, quote);
}

const AD_DELIMITERS = [AD_INTRO_SUFFIX, AD_INTRO_SUFFIX_PREVIOUS, AD_INTRO_SUFFIX_LEGACY].sort(
  (a, b) => b.length - a.length
);

const INLEIDING_SUB_NB_PATTERN = 'nog geen AD-rapport';

function findAdDelimiterIndex(text: string): { index: number; delimiter: string } | null {
  for (const delimiter of AD_DELIMITERS) {
    const idx = text.indexOf(delimiter);
    if (idx !== -1) return { index: idx, delimiter };
  }
  return null;
}

function stripStructuralNewlines(value: string): string {
  return String(value || '').replace(/^\n+/, '').replace(/\n+$/, '');
}

export function stripInleidingSubQuoteWrapping(quote: string): string {
  // Preserve typing spaces and markdown styling; only strip surrounding quote marks.
  let q = stripStructuralNewlines(quote);
  if (q.startsWith('"') && q.endsWith('"') && q.length >= 2) {
    q = q.slice(1, -1);
  }
  return stripLeadingIntakeQuoteLabels(q);
}

export type ParsedInleidingSub = {
  intro: string;
  quote: string;
};

export function parseInleidingSub(raw: string): ParsedInleidingSub {
  const text = String(raw || '');
  if (!text.trim()) return { intro: '', quote: '' };

  if (text.includes('N.B.:') && text.includes(INLEIDING_SUB_NB_PATTERN)) {
    return { intro: text, quote: '' };
  }

  const match = findAdDelimiterIndex(text);
  if (match) {
    const intro = stripStructuralNewlines(text.slice(0, match.index + match.delimiter.length));
    const quote = stripInleidingSubQuoteWrapping(text.slice(match.index + match.delimiter.length));
    return { intro, quote };
  }

  return { intro: text, quote: '' };
}

export function buildInleidingSubBlock(intro: string, quote: string): string {
  // Preserve typing spaces; only omit empty blocks via trim checks.
  if (!quote.trim()) return intro;
  if (!intro.trim()) return quote;
  return `${intro}\n\n${quote}`;
}

export function buildInleidingFields(
  ctx: InleidingBuildContext,
  content: InleidingContentResult
): InleidingFields {
  const paragraphs: string[] = [
    buildGesprek(ctx),
    buildUitval(ctx),
    buildFunctieomschrijving(ctx, content.functieomschrijving),
    buildAanmelding(ctx, content),
    buildMedischeSituatie(ctx, content),
    buildReintegratieEnDoel(ctx, content),
  ];

  const hasDefinitiveAd = hasDefinitiveAdReport(ctx.meta);
  const isConceptAd = isAdReportConcept(ctx.meta);
  const quote = stripLeadingIntakeQuoteLabels(
    coerceText(content.ad_quote) || coerceText(ctx.meta.advies_ad_passende_arbeid)
  );
  const hasConceptAdQuote = isConceptAd && Boolean(quote);

  if (!hasDefinitiveAd && !hasConceptAdQuote) {
    paragraphs.push(`**${INLEIDING_GEEN_AD}**`);
  }

  const inleiding = paragraphs.join('\n\n');

  let inleiding_sub = '';
  if (hasDefinitiveAd || hasConceptAdQuote) {
    if (quote) {
      const adName = formatPersonShortName(
        coerceText(ctx.meta.occupational_doctor_name, '[naam arbeidsdeskundige]')
      );
      const adDate = nlDate(ctx.meta.ad_report_date) || '[datum]';
      inleiding_sub = buildAdSubBlock(
        adName,
        adDate,
        quote,
        isConceptAd
      );
    }
  }

  return { inleiding, inleiding_sub };
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
