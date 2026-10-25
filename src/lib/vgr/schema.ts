/**
 * VGR (Voortgangsrapportage) data model — schema v2.
 *
 * One `vgr_instances.data_json` holds the complete report (01 cover → 05 bijlage 2).
 * Gegevens keys (01/02) are flat and mirror the TP 2026 keys so shared helpers
 * (`getWerkgeverName`, `getReferentDisplayFields`, `FooterIdentity`) work unchanged.
 * Report-specific structures live under `vgr_meta`, `body`, `planning_phases`, `applications`.
 */
import { parseDateFlexible } from '@/lib/tp2026/trajectory-dates';

export const VGR_SCHEMA_VERSION = 2;

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

export type VGRStatus = 'draft' | 'review' | 'final';

export type VGRMeta = {
  schema_version: number;
  /** Rapportageperiode (ISO dates). */
  period_start: string;
  period_end: string;
  /** Datum rapportage (ISO). Shown on cover. */
  report_date: string;
  /** Linked TP draft/instance used for prefill (nullable). */
  linked_tp_instance_id: string | null;
  /** Previous finalized VGR instance (nullable for the first VGR). */
  prior_vgr_instance_id: string | null;
  /** Previous export snapshot id used as "vorige rapportage". */
  prior_vgr_export_id: string | null;
  /** Report sequence number (1 = eerste VGR). */
  version: number;
  /** Document ids selected as sources for AI generation. */
  source_document_ids: string[];
  /** Dismissed consistency warnings: id → rationale. */
  dismissed_warnings: Record<string, string>;
  /** ISO timestamp set when adviser approves for export. */
  approved_at: string | null;
};

/* ------------------------------------------------------------------ */
/* Body (03)                                                           */
/* ------------------------------------------------------------------ */

export type JaNee = boolean | null;

export type VGRTrajectDoel = 'arbeidsmarkt_orientatie' | 'activering' | 'betaald_werk' | 'on_hold' | '';

export const VGR_TRAJECT_DOEL_OPTIONS: { value: Exclude<VGRTrajectDoel, ''>; label: string }[] = [
  { value: 'arbeidsmarkt_orientatie', label: 'Arbeidsmarkt-oriëntatie' },
  { value: 'activering', label: 'Activering' },
  { value: 'betaald_werk', label: 'Betaald werk' },
  { value: 'on_hold', label: 'On hold' },
];

export function trajectDoelLabel(value: VGRTrajectDoel | string | null | undefined): string {
  const hit = VGR_TRAJECT_DOEL_OPTIONS.find((o) => o.value === value);
  return hit ? hit.label : '';
}

export type VGRGoalHistoryEntry = {
  id: string;
  /** ISO date of the VGR / decision. */
  date: string;
  /** '' when unchanged. */
  from: VGRTrajectDoel;
  to: VGRTrajectDoel;
  changed: boolean;
  toelichting: string;
};

export const VGR_FML_RUBRIEKEN = [
  'Persoonlijk functioneren',
  'Sociaal functioneren',
  'Aanpassing aan fysische en/of fysieke omgevingseisen',
  'Dynamische handelingen',
  'Statische houdingen',
  'Werktijden',
] as const;

export type VGRFmlRubriek = (typeof VGR_FML_RUBRIEKEN)[number];

export type VGRBelastbaarheidKind = 'fml' | 'izp' | 'lab' | '';

export type VGRCapacityRevision = {
  id: string;
  date: string;
  auteur: string;
  kind: VGRBelastbaarheidKind;
  rubrieken: VGRFmlRubriek[];
  toelichting: string;
};

export type VGRQuoteBlock = {
  /** Naam bedrijfsarts / arbeidsdeskundige. */
  bron_naam: string;
  /** ISO date of the source document. */
  bron_datum: string;
  /** Type of source: belastbaarheidsprofiel, spreekuur, AD-rapport. */
  bron_type: string;
  citaat: string;
};

export type VGRInterventionBlock = {
  /** Adviser prose for this intervention (case specific). */
  toelichting: string;
  /** Extra structured entries (e.g. webinar titles, beroepen). */
  items: string[];
  /** Render the template's generic description paragraph above the toelichting (default true). */
  standaardtekst: boolean;
};

export type VGRInterventionSection = {
  selected: string[];
  blocks: Record<string, VGRInterventionBlock>;
  /** "Onderstaande activiteiten komen in fase 2/3 … aan bod" (optional). */
  vervolg_activiteiten: string;
  vervolg_periode_van: string;
  vervolg_periode_tot: string;
};

export type VGRPersonalityScores = {
  emotionele_stabiliteit: string;
  extraversie: string;
  ordelijkheid: string;
  vriendelijkheid: string;
  openheid: string;
};

export type VGRPowMeasurement = {
  id: string;
  /** ISO date (datum VGR). */
  date: string;
  toelichting: string;
};

export type VGRPowTrede = 1 | 2 | 3 | 4 | 5 | 6 | null;

export type VGRLeernavigatorItem = {
  id: string;
  label: string;
  checked: boolean;
  /** For "… uur per week" items. */
  uren: string;
};

export type VGRBody = {
  periode_tekst_override: string;
  benutbare_mogelijkheden: {
    heeft: JaNee;
    prognose: VGRQuoteBlock;
    conclusie: VGRQuoteBlock;
    advies: VGRQuoteBlock;
    /** Earlier (TP) prognosis to distinguish from current. */
    eerdere_prognose: string;
  };
  praktische_belemmeringen: { aanwezig: JaNee; toelichting: string };
  doelstelling_traject: {
    huidige: VGRTrajectDoel;
    bij_intake: VGRTrajectDoel;
    history: VGRGoalHistoryEntry[];
    toelichting: string;
  };
  persoonlijk_profiel: { tekst: string };
  belastbaarheidsprofiel: {
    kind: VGRBelastbaarheidKind;
    datum: string;
    auteur: string;
    rubrieken: VGRFmlRubriek[];
    toelichting: string;
  };
  bijstellingen_belastbaarheid: {
    aanwezig: JaNee;
    revisions: VGRCapacityRevision[];
    toelichting_geen: string;
  };
  wijzigingen_doelstelling: { aanwezig: JaNee; toelichting: string };
  zoekprofiel: { tekst: string };
  inzet_houding: { werkt_mee: JaNee; toelichting: string };
  interventies_motivatie: VGRInterventionSection;
  kwaliteiten_onderzoek: VGRInterventionSection & {
    persoonlijkheid_scores: VGRPersonalityScores;
    persoonlijkheid_teksten: VGRPersonalityScores;
    beroepen: string[];
    beroepen_conclusie: string;
  };
  scholing: VGRInterventionSection;
  sollicitatie_vaardigheden: VGRInterventionSection;
  interventies_activatie: VGRInterventionSection;
  pow: {
    intake_trede: VGRPowTrede;
    huidige_trede: VGRPowTrede;
    doel_trede: VGRPowTrede;
    doel_onbekend: boolean;
    werkzame_uren: string;
    werkzame_uren_context: string;
    history: VGRPowMeasurement[];
    confirmed: boolean;
  };
  visie_plaatsbaarheid: {
    ad: VGRQuoteBlock;
    kansen: 'zeer_onwaarschijnlijk' | 'matig' | 'voldoende' | 'goed' | '';
    functies: string[];
    conclusie: string;
  };
  leernavigator: {
    basis: VGRLeernavigatorItem[];
    activering: VGRLeernavigatorItem[];
  };
};

export const VGR_KANSEN_OPTIONS: { value: VGRBody['visie_plaatsbaarheid']['kansen']; label: string }[] = [
  { value: 'zeer_onwaarschijnlijk', label: 'zeer onwaarschijnlijk' },
  { value: 'matig', label: 'matig' },
  { value: 'voldoende', label: 'voldoende' },
  { value: 'goed', label: 'goed' },
];

/* ------------------------------------------------------------------ */
/* Planning (04) & applications (05)                                   */
/* ------------------------------------------------------------------ */

export type VGRPlanningStatus = 'G' | 'P' | 'N' | 'U';
export const VGR_PLANNING_STATUSES: VGRPlanningStatus[] = ['G', 'P', 'N', 'U'];

export type VGRPlanningActivity = {
  id: string;
  name: string;
  status: VGRPlanningStatus;
  note: string;
};

export type VGRPlanningPhase = {
  id: string;
  title: string;
  goal: string;
  period_from: string;
  period_to: string;
  activities: VGRPlanningActivity[];
};

export const VGR_APPLICATION_TYPES = [
  'Sollicitatie',
  'Open sollicitatie',
  'Sollicitatiegesprek',
  'Netwerkgesprek',
  'Banenmarkt',
  'Open Dag',
  'Werkervaringsplek',
  'Activeringsplek',
  'Webinar',
] as const;

export const VGR_APPLICATION_STATUSES = ['in behandeling', 'afgewezen', 'vervuld', 'te zwaar'] as const;

export type VGRApplication = {
  id: string;
  /** ISO date (optional). */
  date: string;
  /** YYYY-MM; derived from `date` when present. */
  month_key: string;
  type: string;
  functie: string;
  organisatie: string;
  status: string;
  note: string;
};

/* ------------------------------------------------------------------ */
/* AI proposals (editor only; stripped from PDF)                       */
/* ------------------------------------------------------------------ */

export type VGRAiProposal = {
  section_id: string;
  generated_at: string;
  /** Structured patch proposed by the model (section-specific). */
  patch: Record<string, unknown>;
  /** Human readable summary of sources used. */
  evidence: string[];
  /** Missing information / uncertainty notes. */
  notes: string[];
  status: 'proposed' | 'applied' | 'rejected';
};

export type VGRTestSummary = {
  id: string;
  generated_at: string;
  source_document_ids: string[];
  tests_present: string[];
  summary_text: string;
  personality_scores: VGRPersonalityScores | null;
  occupations: string[];
  status: 'draft' | 'inserted' | 'rejected';
};

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export type VGRData = Record<string, any> & {
  vgr_meta: VGRMeta;
  body: VGRBody;
  planning_phases: VGRPlanningPhase[];
  applications: VGRApplication[];
  ai_proposals: Record<string, VGRAiProposal>;
  test_summaries: VGRTestSummary[];
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function formatNLDate(input?: string | null): string {
  if (!input) return '—';
  const d = parseDateFlexible(String(input));
  if (!d) return '—';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatNLMonthYear(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey || '');
  if (!m) return monthKey || '—';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  const s = d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthKeyFromDate(iso: string): string {
  const d = parseDateFlexible(iso || '');
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function newVgrId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export function emptyQuote(): VGRQuoteBlock {
  return { bron_naam: '', bron_datum: '', bron_type: '', citaat: '' };
}

export function emptyInterventionSection(): VGRInterventionSection {
  return {
    selected: [],
    blocks: {},
    vervolg_activiteiten: '',
    vervolg_periode_van: '',
    vervolg_periode_tot: '',
  };
}

export function emptyPersonalityScores(): VGRPersonalityScores {
  return {
    emotionele_stabiliteit: '',
    extraversie: '',
    ordelijkheid: '',
    vriendelijkheid: '',
    openheid: '',
  };
}
