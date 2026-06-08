import type { ReferentRow } from '@/lib/referents';
import {
  AD_INTRO_SUFFIX,
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
    contract_hours?: string | null;
    date_of_birth?: string | null;
  };
  meta: {
    intake_date?: string | null;
    first_sick_day?: string | null;
    has_ad_report?: boolean | null;
    ad_report_date?: string | null;
    occupational_doctor_name?: string | null;
    advies_ad_passende_arbeid?: string | null;
  };
  client: { name?: string | null };
  referent: ReferentRow | null;
};

export type InleidingFields = {
  inleiding: string;
  inleiding_sub: string;
};

export function nlDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isMale(gender?: string | null): boolean {
  const g = (gender || '').toLowerCase();
  return g === 'male' || g === 'man' || g === 'm';
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

function refTitle(gender?: string | null): string {
  return isMale(gender) ? 'meneer' : 'mevrouw';
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

function buildGesprek(ctx: InleidingBuildContext): string {
  const lastName = ctx.employee.last_name?.trim() || '[achternaam]';
  const intakeDate = nlDate(ctx.meta.intake_date) || '[datum intake]';
  return `Ik heb ${heerMevrouw(ctx.details.gender)} ${lastName}, hierna werknemer te noemen, gesproken op ${intakeDate}.`;
}

function buildUitval(ctx: InleidingBuildContext): string {
  const age = calculateAge(ctx.details.date_of_birth);
  const agePart = age != null ? `${age}-jarige ` : '';
  const poss = pronPoss(ctx.details.gender);
  const job = (ctx.details.current_job || '[functie]').toLowerCase();
  const employer = ctx.client.name?.trim() || '[werkgever]';
  const sickDay = nlDate(ctx.meta.first_sick_day) || '[eerste ziektedag]';
  const hours = ctx.details.contract_hours?.trim() || '[uren]';
  return `Werknemer is een ${agePart}${genderWord(ctx.details.gender)} die als gevolg van medische beperkingen is uitgevallen sinds ${sickDay} voor ${poss} functie als ${job} bij ${employer}. De functie heeft een urenomvang van ${hours} uur per week.`;
}

function buildFunctieomschrijving(body: string): string {
  const trimmed = body.trim() || '...';
  return `**Functieomschrijving**\n${trimmed}`;
}

function buildAanmelding(ctx: InleidingBuildContext, content: InleidingContentResult): string {
  const companyName = ctx.client.name?.trim() || '[organisatie]';
  const ref = ctx.referent;
  const refInitials = getInitials(ref?.first_name);
  const refLastName = ref?.last_name?.trim() || '[naam aanmelder]';
  const refFunction = ref?.referent_function?.trim() || 'contactpersoon';
  const refGenderTitle = refTitle(ref?.gender);

  const suffix =
    ' aangemeld met het verzoek een 2e spoor re-integratietraject op te starten in het kader van de Wet Verbetering Poortwachter.';

  if (content.extra_aanmelder) {
    const extra = content.extra_aanmelder;
    return `Werknemer is door ${refGenderTitle} ${extra.naam}, ${extra.functie} bij ${extra.organisatie} In opdracht van: ${refGenderTitle} ${refInitials} ${refLastName}, ${refFunction} ${companyName}${suffix}`;
  }

  const refName = ref
    ? `${refFunction} ${refInitials} ${refLastName}`.trim()
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

function buildReintegratieEnDoel(ctx: InleidingBuildContext, content: InleidingContentResult): string {
  let reinteg: string;
  if (content.reintegreert_spoor1) {
    const uren = content.reintegratie_uren?.trim() || '[uren]';
    const werkType = content.reintegratie_werk_type || 'eigen werk';
    reinteg = `Ten tijde van het intakegesprek re-integreert werknemer in spoor 1 gedurende ${uren} uur per week in ${werkType}.`;
  } else {
    reinteg = 'Ten tijde van het intakegesprek re-integreert werknemer niet in spoor 1.';
  }

  let doel = `${VALENTINEZ_DOEL_BASE} ${VALENTINEZ_DOEL_AFSLUITING}`;
  if (content.werknemer_doel_toelichting?.trim()) {
    doel = `${VALENTINEZ_DOEL_BASE} ${content.werknemer_doel_toelichting.trim()} ${VALENTINEZ_DOEL_AFSLUITING}`;
  }

  return `${reinteg} ${doel}`;
}

export function buildAdSubBlock(
  adName: string,
  adDate: string,
  quote: string
): string {
  const intro = `In het arbeidsdeskundig rapport opgesteld door ${adName} op ${adDate} ${AD_INTRO_SUFFIX}`;
  return `${intro}\n\n${quote.trim()}`;
}

export function buildInleidingFields(
  ctx: InleidingBuildContext,
  content: InleidingContentResult
): InleidingFields {
  const paragraphs: string[] = [
    buildGesprek(ctx),
    buildUitval(ctx),
    buildFunctieomschrijving(content.functieomschrijving),
    buildAanmelding(ctx, content),
    buildMedischeSituatie(ctx, content),
    buildReintegratieEnDoel(ctx, content),
  ];

  const hasAd = Boolean(ctx.meta.has_ad_report);
  if (!hasAd) {
    paragraphs.push(`**${INLEIDING_GEEN_AD}**`);
  }

  const inleiding = paragraphs.join('\n\n');

  let inleiding_sub = '';
  if (hasAd) {
    const quote =
      content.ad_quote?.trim() ||
      ctx.meta.advies_ad_passende_arbeid?.trim() ||
      '';
    if (quote) {
      const adName = ctx.meta.occupational_doctor_name?.trim() || '[naam arbeidsdeskundige]';
      const adDate = nlDate(ctx.meta.ad_report_date) || '[datum]';
      inleiding_sub = buildAdSubBlock(adName, adDate, quote);
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
