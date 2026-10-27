import { isIntakeDocumentType } from '@/lib/document-analysis/storage';
import type { IntakeData, IntakeEducationRow, IntakeWorkExperienceRow } from '@/lib/intake/schema';
import type { IntakeSectie3Content } from '@/lib/tp/intake-sectie3/schema';
import type { IntakeSectie5Content } from '@/lib/tp/intake-sectie5/schema';
import type { IntakeSectie7Content } from '@/lib/tp/intake-sectie7/schema';

const SOURCE_PREAMBLE =
  'INTAKEFORMULIER (gedigitaliseerd en gevalideerd). Gebruik deze tekst als het intakeformulier.';

const RUBRIEK_BY_KEY = {
  persoonlijk_functioneren: 'Persoonlijk functioneren',
  sociaal_functioneren: 'Sociaal functioneren',
  aanpassingen_fysieke_omgevingseisen: 'Aanpassing aan fysieke omgevingseisen',
  dynamische_handelingen: 'Dynamische handelingen',
  statische_houdingen: 'Statische houdingen',
  werktijden: 'Werktijden',
} as const;

function field(label: string, value: unknown): string | null {
  if (typeof value === 'boolean') return value ? `${label}: ja` : null;
  if (Array.isArray(value)) {
    const parts = value.map((item) => String(item ?? '').trim()).filter(Boolean);
    if (!parts.length) return null;
    return `${label}: ${parts.join(', ')}`;
  }
  const text = String(value ?? '').trim();
  if (!text) return null;
  return `${label}: ${text}`;
}

function section(title: string, lines: Array<string | null>): string {
  const body = lines.filter((line): line is string => Boolean(line));
  if (!body.length) return '';
  return `${title}\n${body.join('\n')}`;
}

function joinSections(sections: string[]): string {
  const body = sections.map((part) => part.trim()).filter(Boolean);
  if (!body.length) return '';
  return `${SOURCE_PREAMBLE}\n\n${body.join('\n\n')}`;
}

function formatEducation(rows: IntakeEducationRow[]): string | null {
  const lines = rows
    .map((row) => {
      const name = row.opleiding.trim();
      if (!name) return '';
      const status =
        row.afgerond === 'ja' ? 'afgerond' : row.afgerond === 'nee' ? 'niet afgerond' : '';
      return ['- ' + name, status].filter(Boolean).join(' — ');
    })
    .filter(Boolean);
  if (!lines.length) return null;
  return `Opleidingen:\n${lines.join('\n')}`;
}

function formatWork(rows: IntakeWorkExperienceRow[]): string | null {
  const lines = rows
    .map((row) => {
      const role = row.functie.trim();
      const period = row.van_tot.trim();
      if (!role && !period) return '';
      return ['- ' + role, period].filter(Boolean).join(' — ');
    })
    .filter(Boolean);
  if (!lines.length) return null;
  return `Werkervaring:\n${lines.join('\n')}`;
}

function socialeSections(intake: IntakeData): string[] {
  return [
    section('Sectie 8 Woonsituatie', [
      field('Woonplaats', intake.s8.woonplaats),
      field('Woonsituatie', intake.s8.woonsituatie),
      field('Uitwonende kinderen', intake.s8.uitwonende_kinderen),
    ]),
    section('Sectie 9 Familie en sociaal netwerk', [
      field('Contact familie', intake.s9.contact_familie),
      field('Hoe vaak contact', intake.s9.hoe_vaak_contact),
      field('Ondersteuning familie', intake.s9.ondersteuning_familie),
      field('Mantelzorg', intake.s9.mantelzorg),
    ]),
    section('Sectie 10 Huishoudelijke taken en zorgtaken', [
      field('Zelfstandig huishouden', intake.s10.zelfstandig_huishouden),
      field('Hulp huishouden', intake.s10.hulp_huishouden),
      field('Taken verdeeld', intake.s10.taken_verdeeld),
    ]),
    section('Sectie 11 Dagstructuur en energieverdeling', [
      field('Gemiddelde dag', intake.s11.gemiddelde_dag),
      field('Activiteiten buitenshuis', intake.s11.activiteiten_buitenshuis),
      field('Energie en belastbaarheid', intake.s11.energie_belastbaarheid),
    ]),
    section("Sectie 12 Vrije tijd en hobby's", [
      field("Hobby's", intake.s12.hobbies),
      field('Leest of muziek', intake.s12.leest_of_muziek),
      field('Kan uitvoeren', intake.s12.kan_uitvoeren),
      field('Graag oppakken', intake.s12.graag_oppakken),
    ]),
  ];
}

function reintegratieSection(intake: IntakeData): string {
  return section('Sectie 6 Re-integratie', [
    field('Actief spoor 1', intake.s6.actief_spoor1),
    field('Eigen of aangepast werk', intake.s6.eigen_of_aangepast_werk),
    field('Uren werkzaam', intake.s6.uren_werkzaam),
    field('Opbouwschema aanwezig', intake.s6.opbouwschema_aanwezig),
    field('Wat lukt wel of niet', intake.s6.wat_lukt_wel_niet),
    field('Ervaart belastbaarheid', intake.s6.ervaart_belastbaarheid),
    field('Andere werkgever', intake.s6.andere_werkgever),
  ]);
}

function profileSections(intake: IntakeData): string[] {
  return [
    section('Sectie 2 Functie', [field('Huidige functie', intake.s2.current_job)]),
    section('Sectie 17 Opleiding, werk, vervoer en taal', [
      field('Opleidingsniveau', intake.s17.education_level),
      field('Opleiding', intake.s17.education_name),
      formatEducation(intake.s17.opleidingen),
      field('Werkervaring', intake.s17.work_experience),
      formatWork(intake.s17.werkervaring),
      field('Rijbewijs', intake.s17.drivers_license_types),
      field('Vervoer', intake.s17.transport_types),
      field('PC', intake.s17.has_pc),
      field('Smartphone', intake.s17.has_smartphone),
      field('Tablet', intake.s17.has_tablet),
      field('Computervaardigheden', intake.s17.computer_skills),
      field('Computervaardigheden toelichting', intake.s17.computer_skills_extra),
      field('Typvaardigheid', intake.s17.typing_skills),
      field('Nederlands spreken', intake.s17.dutch_speaking),
      field('Nederlands schrijven', intake.s17.dutch_writing),
      field('Andere talen', intake.s17.other_languages),
    ]),
  ];
}

/** Drop intake PDFs when a validated digitized intake already supplies that source. */
export function omitIntakePdfDocs<T extends { type?: string | null }>(docs: T[]): T[] {
  return docs.filter((doc) => !isIntakeDocumentType(doc.type));
}

export function intakeTextForInleiding(intake: IntakeData): string {
  return joinSections([
    section('Sectie 3 Functiebeschrijving', [
      field(
        'Korte beschrijving van de werkzaamheden',
        intake.s3.korte_beschrijving_werkzaamheden
      ),
    ]),
    section('Sectie 4 Extra aanmelder', [
      field('Naam', intake.s4.extra_referent_name),
      field('Functie', intake.s4.extra_referent_function),
    ]),
    section('Sectie 5 Behandeling', [
      field('Behandeling', intake.s5.behandeling),
      field('Reden ziekmelding', intake.s5.reden_ziekmelding),
    ]),
    reintegratieSection(intake),
    section('Sectie 7 Advies arbeidsdeskundige', [
      field('AD auteur', intake.s7.ad_auteur),
      field('Quote advies spoor 2', intake.s7.quote_advies_spoor2),
    ]),
  ]);
}

export function intakeTextForSociale(intake: IntakeData): string {
  return joinSections([
    ...socialeSections(intake),
    section('Algemene informatie (vervoer en talen)', [
      field('Vervoer', intake.s17.transport_types),
      field('Rijbewijs', intake.s17.drivers_license_types),
      field('Nederlands spreken', intake.s17.dutch_speaking),
      field('Nederlands schrijven', intake.s17.dutch_writing),
      field('Andere talen', intake.s17.other_languages),
    ]),
  ]);
}

export function intakeTextForVisieWerknemer(intake: IntakeData): string {
  return joinSections([
    reintegratieSection(intake),
    section('Sectie 13 Werkverleden en verbondenheid', [
      field('Hoe lang werkzaam', intake.s13.hoe_lang_werkzaam),
      field('Verbonden met organisatie', intake.s13.verbonden_organisatie),
      field('Wens terugkeer', intake.s13.wens_terugkeer),
    ]),
    section('Sectie 14 Houding ten opzichte van spoor 2', [
      field('Houding spoor 2', intake.s14.houding_spoor2),
    ]),
    section('Sectie 16 Toekomstbeeld en voorkeuren', [
      field('Interesses en voorkeuren', intake.s16.interesses_voorkeuren),
      field('Ideeën passend werk', intake.s16.ideeen_passend_werk),
      field('Bereid tot scholing', intake.s16.bereid_scholing),
      field('Graag ontdekken', intake.s16.graag_ontdekken),
    ]),
  ]);
}

export function intakeTextForPersoonlijkProfiel(intake: IntakeData): string {
  return joinSections(profileSections(intake));
}

export function intakeTextForPowMeter(intake: IntakeData): string {
  return joinSections([
    reintegratieSection(intake),
    ...socialeSections(intake),
    section('Sectie 13 Werkverleden en verbondenheid', [
      field('Wens terugkeer', intake.s13.wens_terugkeer),
    ]),
    section('Sectie 14 Houding ten opzichte van spoor 2', [
      field('Houding spoor 2', intake.s14.houding_spoor2),
    ]),
  ]);
}

export function intakeTextForVisieLoopbaanadviseur(intake: IntakeData): string {
  return joinSections([
    ...profileSections(intake),
    section('Sectie 13 Werkverleden en verbondenheid', [
      field('Hoe lang werkzaam', intake.s13.hoe_lang_werkzaam),
      field('Wens terugkeer', intake.s13.wens_terugkeer),
    ]),
    section('Sectie 16 Toekomstbeeld en voorkeuren', [
      field('Interesses en voorkeuren', intake.s16.interesses_voorkeuren),
      field('Ideeën passend werk', intake.s16.ideeen_passend_werk),
      field('Bereid tot scholing', intake.s16.bereid_scholing),
    ]),
  ]);
}

export function intakeTextForZoekprofiel(intake: IntakeData): string {
  return joinSections([
    section('Sectie 2 Functie', [field('Huidige functie', intake.s2.current_job)]),
    section('Sectie 17 Opleiding en werkervaring', [
      field('Opleidingsniveau', intake.s17.education_level),
      field('Opleiding', intake.s17.education_name),
      formatEducation(intake.s17.opleidingen),
      field('Werkervaring', intake.s17.work_experience),
      formatWork(intake.s17.werkervaring),
    ]),
  ]);
}

export function intakePraktischeBelemmeringen(intake: IntakeData): string {
  return intake.s17.praktische_belemmeringen.trim();
}

export function intakeToSectie3Content(intake: IntakeData): IntakeSectie3Content | null {
  const text = intake.s3.korte_beschrijving_werkzaamheden.trim();
  if (!text) return null;
  return { korte_beschrijving_werkzaamheden: text };
}

export function intakeToSectie5Content(intake: IntakeData): IntakeSectie5Content | null {
  const quote = intake.s5.quote_prognose_advies_belastbaarheid.trim() || null;
  const rubrieken = (Object.keys(RUBRIEK_BY_KEY) as Array<keyof typeof RUBRIEK_BY_KEY>)
    .filter((key) => intake.s5.fml_beperkingen[key])
    .map((key) => RUBRIEK_BY_KEY[key]);
  if (!quote && rubrieken.length === 0) return null;
  return { quote_prognose_advies_belastbaarheid: quote, rubrieken };
}

export function intakeToSectie7Content(intake: IntakeData): IntakeSectie7Content | null {
  const adAuteur =
    intake.s7.ad_auteur.trim() || intake.s6.occupational_doctor_ad_name.trim() || null;
  const adDatum = intake.s6.ad_report_date.trim() || null;
  const advies = intake.s7.quote_advies_spoor2.trim() || null;
  const passende = intake.s7.quote_passende_functies.trim() || null;
  const functieCategorien = intake.s7.functie_categorien
    .map((row) => ({ naam: row.naam.trim(), toelichting: row.toelichting.trim() }))
    .filter((row) => row.naam);
  if (!adAuteur && !adDatum && !advies && !passende && functieCategorien.length === 0) {
    return null;
  }
  return {
    ad_auteur: adAuteur,
    ad_datum_iso: adDatum,
    quote_advies_spoor2: advies,
    quote_passende_functies: passende,
    functie_categorien: functieCategorien,
  };
}
