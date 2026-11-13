/** Intake document layout key and empty/shaped data_json for sections 1–17. */

export const INTAKE_LAYOUT_KEY = 'intake_v1' as const;
export type IntakeLayoutKey = typeof INTAKE_LAYOUT_KEY;

export const INTAKE_FORM_VERSION = 'perfectview_v5' as const;

export type IntakeConflict = {
  field: string;
  message: string;
};

export type IntakeEducationRow = {
  opleiding: string;
  afgerond: 'ja' | 'nee' | null;
};

export type IntakeWorkExperienceRow = {
  functie: string;
  van_tot: string;
};

export type IntakeFunctieCategorie = {
  naam: string;
  toelichting: string;
};

export type IntakeMeta = {
  form_version: string;
  conflicts: IntakeConflict[];
  generation_notes: string[];
};

export type IntakeSection1 = {
  employee_name: string;
  intake_date: string;
};

export type IntakeSection2 = {
  age: string;
  gender: string;
  current_job: string;
  employer: string;
  contract_hours: string;
  city: string;
  phone: string;
  email: string;
  other_employers: string;
};

export type IntakeSection3 = {
  korte_beschrijving_werkzaamheden: string;
};

export type IntakeSection4 = {
  referent_name: string;
  referent_function: string;
  referent_phone: string;
  referent_email: string;
  extra_referent_name: string;
  extra_referent_function: string;
};

export type IntakeFmlBeperkingen = {
  persoonlijk_functioneren: boolean;
  sociaal_functioneren: boolean;
  dynamische_handelingen: boolean;
  statische_houdingen: boolean;
  aanpassingen_fysieke_omgevingseisen: boolean;
  werktijden: boolean;
};

export type IntakeSection5 = {
  first_sick_day: string;
  reden_ziekmelding: string;
  fml_beperkingen: IntakeFmlBeperkingen;
  quote_prognose_advies_belastbaarheid: string;
  behandeling: string;
};

export type IntakeSection6 = {
  date_of_birth: string;
  weken: string;
  registration_date: string;
  tp_start_date: string;
  fml_izp_lab_date: string;
  fml_izp_lab_kind: 'fml' | 'izp' | '';
  tp_end_date: string;
  doctor_role: string;
  occupational_doctor_name: string;
  ad_report_date: string;
  ad_report_concept: boolean;
  osv_doctor_role: string;
  osv_doctor_name: string;
  occupational_doctor_ad_name: string;
  is_ex_werknemer: boolean;
  actief_spoor1: string;
  eigen_of_aangepast_werk: string;
  uren_werkzaam: string;
  opbouwschema_aanwezig: string;
  wat_lukt_wel_niet: string;
  ervaart_belastbaarheid: string;
  andere_werkgever: string;
};

export type IntakeSection7 = {
  ad_auteur: string;
  quote_advies_spoor2: string;
  quote_passende_functies: string;
  functie_categorien: IntakeFunctieCategorie[];
};

/** Single narrative field for social/visie sections 8–13. */
export type IntakeNarrativeSection = {
  tekst: string;
};

export type IntakeSection8 = IntakeNarrativeSection;
export type IntakeSection9 = IntakeNarrativeSection;
export type IntakeSection10 = IntakeNarrativeSection;
export type IntakeSection11 = IntakeNarrativeSection;
export type IntakeSection12 = IntakeNarrativeSection;
export type IntakeSection13 = IntakeNarrativeSection;

/** Former sub-questions kept as coverage hints (UI + AI), not separate inputs. */
export const INTAKE_NARRATIVE_ASPECTS = {
  s8: [
    'Woonsituatie werknemer',
    'Zijn er uitwonende kinderen',
  ],
  s9: [
    'Hoe is het contact met familieleden',
    'Hoe vaak is er contact',
    'Ondersteuning van familie/vrienden',
    'Mantelzorg of wederzijdse hulp',
  ],
  s10: [
    'Zelfstandig zorg voor het huishouden',
    'Hulp van partner, familie en/of vrienden',
    'Hoe worden de taken verdeeld',
  ],
  s11: [
    'Hoe ziet een gemiddelde dag eruit',
    'Activiteiten buitenshuis',
    'Energie of belastbaarheid',
  ],
  s12: [
    "Hobby's / ontspanningsvormen",
    'Leest of luistert naar muziek',
    'Kan werknemer deze nu uitvoeren',
    'Activiteiten graag (weer) oppakken',
  ],
  s13: [
    'Hoe lang werkzaam bij werkgever',
    'Verbonden met de organisatie',
    'Wens terug te keren in eigen functie',
  ],
} as const;

export type IntakeNarrativeSectionKey = keyof typeof INTAKE_NARRATIVE_ASPECTS;

const NARRATIVE_LEGACY_KEYS: Record<IntakeNarrativeSectionKey, readonly string[]> = {
  s8: ['woonplaats', 'woonsituatie', 'uitwonende_kinderen'],
  s9: ['contact_familie', 'hoe_vaak_contact', 'ondersteuning_familie', 'mantelzorg'],
  s10: ['zelfstandig_huishouden', 'hulp_huishouden', 'taken_verdeeld'],
  s11: ['gemiddelde_dag', 'activiteiten_buitenshuis', 'energie_belastbaarheid'],
  s12: ['hobbies', 'leest_of_muziek', 'kan_uitvoeren', 'graag_oppakken'],
  s13: ['hoe_lang_werkzaam', 'verbonden_organisatie', 'wens_terugkeer'],
};

export type IntakeSection14 = {
  houding_spoor2: string;
};

export type IntakeSection16 = {
  interesses_voorkeuren: string;
  ideeen_passend_werk: string;
  bereid_scholing: string;
  graag_ontdekken: string;
};

export type IntakeSection17 = {
  bijzonderheden: string;
  praktische_belemmeringen: string;
  opleidingen: IntakeEducationRow[];
  werkervaring: IntakeWorkExperienceRow[];
  education_level: string;
  education_name: string;
  work_experience: string;
  has_pc: boolean;
  has_smartphone: boolean;
  has_tablet: boolean;
  computer_skills: string;
  computer_skills_extra: string;
  typing_skills: string;
  drivers_license_types: string[];
  transport_types: string[];
  dutch_speaking: string;
  dutch_writing: string;
  dutch_reading: string;
  other_languages: string;
};

export type IntakeData = {
  meta: IntakeMeta;
  s1: IntakeSection1;
  s2: IntakeSection2;
  s3: IntakeSection3;
  s4: IntakeSection4;
  s5: IntakeSection5;
  s6: IntakeSection6;
  s7: IntakeSection7;
  s8: IntakeSection8;
  s9: IntakeSection9;
  s10: IntakeSection10;
  s11: IntakeSection11;
  s12: IntakeSection12;
  s13: IntakeSection13;
  s14: IntakeSection14;
  s16: IntakeSection16;
  s17: IntakeSection17;
};

function emptyFmlBeperkingen(): IntakeFmlBeperkingen {
  return {
    persoonlijk_functioneren: false,
    sociaal_functioneren: false,
    dynamische_handelingen: false,
    statische_houdingen: false,
    aanpassingen_fysieke_omgevingseisen: false,
    werktijden: false,
  };
}

export function createEmptyIntakeData(): IntakeData {
  return {
    meta: {
      form_version: INTAKE_FORM_VERSION,
      conflicts: [],
      generation_notes: [],
    },
    s1: { employee_name: '', intake_date: '' },
    s2: {
      age: '',
      gender: '',
      current_job: '',
      employer: '',
      contract_hours: '',
      city: '',
      phone: '',
      email: '',
      other_employers: '',
    },
    s3: { korte_beschrijving_werkzaamheden: '' },
    s4: {
      referent_name: '',
      referent_function: '',
      referent_phone: '',
      referent_email: '',
      extra_referent_name: '',
      extra_referent_function: '',
    },
    s5: {
      first_sick_day: '',
      reden_ziekmelding: '',
      fml_beperkingen: emptyFmlBeperkingen(),
      quote_prognose_advies_belastbaarheid: '',
      behandeling: '',
    },
    s6: {
      date_of_birth: '',
      weken: '',
      registration_date: '',
      tp_start_date: '',
      fml_izp_lab_date: '',
      fml_izp_lab_kind: '',
      tp_end_date: '',
      doctor_role: '',
      occupational_doctor_name: '',
      ad_report_date: '',
      ad_report_concept: false,
      osv_doctor_role: '',
      osv_doctor_name: '',
      occupational_doctor_ad_name: '',
      is_ex_werknemer: false,
      actief_spoor1: '',
      eigen_of_aangepast_werk: '',
      uren_werkzaam: '',
      opbouwschema_aanwezig: '',
      wat_lukt_wel_niet: '',
      ervaart_belastbaarheid: '',
      andere_werkgever: '',
    },
    s7: {
      ad_auteur: '',
      quote_advies_spoor2: '',
      quote_passende_functies: '',
      functie_categorien: [],
    },
    s8: { tekst: '' },
    s9: { tekst: '' },
    s10: { tekst: '' },
    s11: { tekst: '' },
    s12: { tekst: '' },
    s13: { tekst: '' },
    s14: { houding_spoor2: '' },
    s16: {
      interesses_voorkeuren: '',
      ideeen_passend_werk: '',
      bereid_scholing: '',
      graag_ontdekken: '',
    },
    s17: {
      bijzonderheden: '',
      praktische_belemmeringen: '',
      opleidingen: [],
      werkervaring: [],
      education_level: '',
      education_name: '',
      work_experience: '',
      has_pc: false,
      has_smartphone: false,
      has_tablet: false,
      computer_skills: '',
      computer_skills_extra: '',
      typing_skills: '',
      drivers_license_types: [],
      transport_types: [],
      dutch_speaking: '',
      dutch_writing: '',
      dutch_reading: '',
      other_languages: '',
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  return String(value);
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function mergeSection<T extends Record<string, unknown>>(
  empty: T,
  raw: unknown
): T {
  const src = asRecord(raw);
  const out = { ...empty };
  for (const key of Object.keys(empty) as (keyof T)[]) {
    if (!(key in src)) continue;
    const current = empty[key];
    const next = src[key as string];
    if (typeof current === 'boolean') {
      out[key] = bool(next, current) as T[keyof T];
    } else if (Array.isArray(current)) {
      out[key] = (Array.isArray(next) ? next : current) as T[keyof T];
    } else if (current && typeof current === 'object') {
      out[key] = mergeSection(current as Record<string, unknown>, next) as T[keyof T];
    } else {
      out[key] = str(next, current as string) as T[keyof T];
    }
  }
  return out;
}

/** Prefer `tekst`; otherwise join legacy multi-field values so old intakes keep content. */
export function normalizeNarrativeSection(
  raw: unknown,
  legacyKeys: readonly string[]
): IntakeNarrativeSection {
  const src = asRecord(raw);
  const existing = str(src.tekst).trim();
  if (existing) return { tekst: existing };

  const parts: string[] = [];
  for (const key of legacyKeys) {
    const value = str(src[key]).trim();
    if (value) parts.push(value);
  }
  return { tekst: parts.join('\n\n') };
}

function normalizeEducationRows(raw: unknown): IntakeEducationRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const o = asRecord(row);
      const opleiding = str(o.opleiding).trim();
      if (!opleiding) return null;
      const af = str(o.afgerond).toLowerCase();
      const afgerond: IntakeEducationRow['afgerond'] =
        af === 'ja' || af === 'yes' || af === 'true'
          ? 'ja'
          : af === 'nee' || af === 'no' || af === 'false'
            ? 'nee'
            : null;
      return { opleiding, afgerond };
    })
    .filter((r): r is IntakeEducationRow => r != null);
}

function normalizeWorkRows(raw: unknown): IntakeWorkExperienceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const o = asRecord(row);
      const functie = str(o.functie).trim();
      if (!functie) return null;
      return { functie, van_tot: str(o.van_tot).trim() };
    })
    .filter((r): r is IntakeWorkExperienceRow => r != null);
}

function normalizeFunctieCategorien(raw: unknown): IntakeFunctieCategorie[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const o = asRecord(row);
      const naam = str(o.naam).trim();
      if (!naam) return null;
      return { naam, toelichting: str(o.toelichting).trim() };
    })
    .filter((r): r is IntakeFunctieCategorie => r != null);
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => str(v).trim()).filter(Boolean);
}

function normalizeFmlKind(raw: unknown): 'fml' | 'izp' | '' {
  const v = str(raw).toLowerCase().trim();
  if (v === 'fml') return 'fml';
  if (v === 'izp') return 'izp';
  return '';
}

/** Normalize arbitrary JSON into a full IntakeData shape. */
export function ensureIntakeShape(raw: unknown): IntakeData {
  const empty = createEmptyIntakeData();
  const src = asRecord(raw);
  const metaRaw = asRecord(src.meta);

  const shaped: IntakeData = {
    meta: {
      form_version: str(metaRaw.form_version, INTAKE_FORM_VERSION) || INTAKE_FORM_VERSION,
      conflicts: Array.isArray(metaRaw.conflicts)
        ? metaRaw.conflicts
            .map((c) => {
              const o = asRecord(c);
              const field = str(o.field).trim();
              const message = str(o.message).trim();
              if (!field && !message) return null;
              return { field, message };
            })
            .filter((c): c is IntakeConflict => c != null)
        : [],
      generation_notes: normalizeStringArray(metaRaw.generation_notes),
    },
    s1: mergeSection(empty.s1 as unknown as Record<string, unknown>, src.s1) as IntakeSection1,
    s2: mergeSection(empty.s2 as unknown as Record<string, unknown>, src.s2) as IntakeSection2,
    s3: mergeSection(empty.s3 as unknown as Record<string, unknown>, src.s3) as IntakeSection3,
    s4: mergeSection(empty.s4 as unknown as Record<string, unknown>, src.s4) as IntakeSection4,
    s5: {
      ...mergeSection(empty.s5 as unknown as Record<string, unknown>, src.s5),
      fml_beperkingen: mergeSection(
        empty.s5.fml_beperkingen as unknown as Record<string, unknown>,
        asRecord(src.s5).fml_beperkingen
      ) as IntakeFmlBeperkingen,
    } as IntakeSection5,
    s6: {
      ...mergeSection(empty.s6 as unknown as Record<string, unknown>, src.s6),
      fml_izp_lab_kind: normalizeFmlKind(asRecord(src.s6).fml_izp_lab_kind),
      ad_report_concept: bool(asRecord(src.s6).ad_report_concept, false),
      is_ex_werknemer: bool(asRecord(src.s6).is_ex_werknemer, false),
    } as IntakeSection6,
    s7: {
      ...mergeSection(empty.s7 as unknown as Record<string, unknown>, src.s7),
      functie_categorien: normalizeFunctieCategorien(asRecord(src.s7).functie_categorien),
    } as IntakeSection7,
    s8: normalizeNarrativeSection(src.s8, NARRATIVE_LEGACY_KEYS.s8),
    s9: normalizeNarrativeSection(src.s9, NARRATIVE_LEGACY_KEYS.s9),
    s10: normalizeNarrativeSection(src.s10, NARRATIVE_LEGACY_KEYS.s10),
    s11: normalizeNarrativeSection(src.s11, NARRATIVE_LEGACY_KEYS.s11),
    s12: normalizeNarrativeSection(src.s12, NARRATIVE_LEGACY_KEYS.s12),
    s13: normalizeNarrativeSection(src.s13, NARRATIVE_LEGACY_KEYS.s13),
    s14: mergeSection(empty.s14 as unknown as Record<string, unknown>, src.s14) as IntakeSection14,
    s16: mergeSection(empty.s16 as unknown as Record<string, unknown>, src.s16) as IntakeSection16,
    s17: {
      ...mergeSection(empty.s17 as unknown as Record<string, unknown>, src.s17),
      opleidingen: normalizeEducationRows(asRecord(src.s17).opleidingen),
      werkervaring: normalizeWorkRows(asRecord(src.s17).werkervaring),
      drivers_license_types: normalizeStringArray(asRecord(src.s17).drivers_license_types),
      transport_types: normalizeStringArray(asRecord(src.s17).transport_types),
      has_pc: bool(asRecord(src.s17).has_pc, false),
      has_smartphone: bool(asRecord(src.s17).has_smartphone, false),
      has_tablet: bool(asRecord(src.s17).has_tablet, false),
    } as IntakeSection17,
  };

  return shaped;
}

/** Lucide icon keys rendered in the intake left nav. */
export type IntakeSectionIcon =
  | 'dossier'
  | 'message'
  | 'user'
  | 'briefcase'
  | 'userPlus'
  | 'heartPulse'
  | 'refresh'
  | 'fileText'
  | 'home'
  | 'users'
  | 'housework'
  | 'calendar'
  | 'sparkles'
  | 'history'
  | 'compass'
  | 'target'
  | 'info';

export const INTAKE_DOSSIER_NAV = {
  key: 'dossier' as const,
  title: 'Dossiergegevens',
  icon: 'dossier' as IntakeSectionIcon,
};

export const INTAKE_SECTION_DEFS = [
  { key: 's1', title: '1. Gespreksinformatie', icon: 'message' as IntakeSectionIcon },
  { key: 's2', title: '2. Persoonsgegevens', icon: 'user' as IntakeSectionIcon },
  { key: 's3', title: '3. Functiebeschrijving', icon: 'briefcase' as IntakeSectionIcon },
  { key: 's4', title: '4. Aanmelding', icon: 'userPlus' as IntakeSectionIcon },
  { key: 's5', title: '5. Medische situatie', icon: 'heartPulse' as IntakeSectionIcon },
  { key: 's6', title: '6. Re-integratie en houding', icon: 'refresh' as IntakeSectionIcon },
  { key: 's7', title: '7. Arbeidsdeskundig rapport', icon: 'fileText' as IntakeSectionIcon },
  { key: 's8', title: '8. Woonsituatie', icon: 'home' as IntakeSectionIcon },
  { key: 's9', title: '9. Familie en sociaal netwerk', icon: 'users' as IntakeSectionIcon },
  { key: 's10', title: '10. Huishoudelijke taken en zorgtaken', icon: 'housework' as IntakeSectionIcon },
  { key: 's11', title: '11. Dagstructuur en energieverdeling', icon: 'calendar' as IntakeSectionIcon },
  { key: 's12', title: "12. Vrije tijd en hobby's", icon: 'sparkles' as IntakeSectionIcon },
  { key: 's13', title: '13. Werkverleden en verbondenheid', icon: 'history' as IntakeSectionIcon },
  { key: 's14', title: '14. Houding t.o.v. spoor 2', icon: 'compass' as IntakeSectionIcon },
  { key: 's16', title: '16. Toekomstbeeld en voorkeuren', icon: 'target' as IntakeSectionIcon },
  { key: 's17', title: '17. Bijzonderheden', icon: 'info' as IntakeSectionIcon },
] as const;

export type IntakeSectionKey = (typeof INTAKE_SECTION_DEFS)[number]['key'];
