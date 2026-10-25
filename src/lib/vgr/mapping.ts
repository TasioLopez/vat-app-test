import { normalizePersonName } from '@/lib/utils';
import {
  VGR_FML_RUBRIEKEN,
  VGR_SCHEMA_VERSION,
  emptyInterventionSection,
  emptyPersonalityScores,
  emptyQuote,
  monthKeyFromDate,
  newVgrId,
  type JaNee,
  type VGRAiProposal,
  type VGRApplication,
  type VGRBelastbaarheidKind,
  type VGRBody,
  type VGRCapacityRevision,
  type VGRData,
  type VGRFmlRubriek,
  type VGRGoalHistoryEntry,
  type VGRInterventionBlock,
  type VGRInterventionSection,
  type VGRLeernavigatorItem,
  type VGRMeta,
  type VGRPersonalityScores,
  type VGRPlanningPhase,
  type VGRPowMeasurement,
  type VGRPowTrede,
  type VGRQuoteBlock,
  type VGRTestSummary,
  type VGRTrajectDoel,
} from '@/lib/vgr/schema';
import {
  VGR_LEERNAVIGATOR_ACTIVERING_DEFS,
  VGR_LEERNAVIGATOR_BASIS_DEFS,
  createLeernavigatorItems,
  findInterventionOption,
  VGR_ACTIVATIE_OPTIONS,
  VGR_KWALITEITEN_OPTIONS,
  VGR_MOTIVATIE_OPTIONS,
  VGR_SCHOLING_OPTIONS,
  VGR_SOLLICITATIE_OPTIONS,
  type VGRInterventionOption,
} from '@/lib/vgr/content';
import { createDefaultPlanningPhases, normalizePlanningStatus } from '@/lib/vgr/planning-defaults';

/* ------------------------------------------------------------------ */
/* Primitive normalizers                                               */
/* ------------------------------------------------------------------ */

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x)).filter((x) => x.trim().length > 0) : [];
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function jaNee(v: unknown): JaNee {
  if (v === true || v === 'ja' || v === 'Ja' || v === 'true') return true;
  if (v === false || v === 'nee' || v === 'Nee' || v === 'false') return false;
  return null;
}

function trede(v: unknown): VGRPowTrede {
  const n = typeof v === 'number' ? v : parseInt(str(v), 10);
  return n >= 1 && n <= 6 ? (n as VGRPowTrede) : null;
}

function doel(v: unknown): VGRTrajectDoel {
  const s = str(v);
  if (s === 'arbeidsmarkt_orientatie' || s === 'activering' || s === 'betaald_werk' || s === 'on_hold') return s;
  const lower = s.toLowerCase();
  if (lower.includes('oriënt') || lower.includes('orient')) return 'arbeidsmarkt_orientatie';
  if (lower.includes('activering')) return 'activering';
  if (lower.includes('betaald')) return 'betaald_werk';
  if (lower.includes('hold')) return 'on_hold';
  return '';
}

function kind(v: unknown): VGRBelastbaarheidKind {
  const s = str(v).trim().toLowerCase();
  return s === 'fml' || s === 'izp' || s === 'lab' ? s : '';
}

function rubrieken(v: unknown): VGRFmlRubriek[] {
  const set = new Set(strArr(v).map((x) => x.trim().toLowerCase()));
  return VGR_FML_RUBRIEKEN.filter((r) => set.has(r.toLowerCase()));
}

function quote(v: unknown): VGRQuoteBlock {
  const o = obj(v);
  return {
    bron_naam: str(o.bron_naam),
    bron_datum: str(o.bron_datum),
    bron_type: str(o.bron_type),
    citaat: str(o.citaat),
  };
}

function scores(v: unknown): VGRPersonalityScores {
  const o = obj(v);
  const base = emptyPersonalityScores();
  return {
    emotionele_stabiliteit: str(o.emotionele_stabiliteit ?? base.emotionele_stabiliteit),
    extraversie: str(o.extraversie ?? base.extraversie),
    ordelijkheid: str(o.ordelijkheid ?? base.ordelijkheid),
    vriendelijkheid: str(o.vriendelijkheid ?? base.vriendelijkheid),
    openheid: str(o.openheid ?? base.openheid),
  };
}

function block(v: unknown): VGRInterventionBlock {
  const o = obj(v);
  return {
    toelichting: str(o.toelichting),
    items: strArr(o.items),
    standaardtekst: o.standaardtekst === undefined ? true : Boolean(o.standaardtekst),
  };
}

export function normalizeInterventionSection(
  v: unknown,
  options: VGRInterventionOption[]
): VGRInterventionSection {
  const o = obj(v);
  const base = emptyInterventionSection();
  const selectedRaw = strArr(o.selected);
  const selected: string[] = [];
  for (const s of selectedRaw) {
    const opt = findInterventionOption(options, s);
    const id = opt ? opt.id : s;
    if (!selected.includes(id)) selected.push(id);
  }
  const blocksRaw = obj(o.blocks);
  const blocks: Record<string, VGRInterventionBlock> = {};
  for (const [k, val] of Object.entries(blocksRaw)) {
    const opt = findInterventionOption(options, k);
    blocks[opt ? opt.id : k] = block(val);
  }
  return {
    ...base,
    selected,
    blocks,
    vervolg_activiteiten: str(o.vervolg_activiteiten),
    vervolg_periode_van: str(o.vervolg_periode_van),
    vervolg_periode_tot: str(o.vervolg_periode_tot),
  };
}

function goalHistory(v: unknown): VGRGoalHistoryEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => obj(raw))
    .map((o) => ({
      id: str(o.id) || newVgrId('goal'),
      date: str(o.date),
      from: doel(o.from),
      to: doel(o.to),
      changed: Boolean(o.changed),
      toelichting: str(o.toelichting),
    }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function revisions(v: unknown): VGRCapacityRevision[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => obj(raw))
    .map((o) => ({
      id: str(o.id) || newVgrId('rev'),
      date: str(o.date),
      auteur: str(o.auteur),
      kind: kind(o.kind),
      rubrieken: rubrieken(o.rubrieken),
      toelichting: str(o.toelichting),
    }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function powHistory(v: unknown): VGRPowMeasurement[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => obj(raw))
    .map((o) => ({ id: str(o.id) || newVgrId('pow'), date: str(o.date), toelichting: str(o.toelichting) }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function leernavigator(
  v: unknown,
  defs: typeof VGR_LEERNAVIGATOR_BASIS_DEFS
): VGRLeernavigatorItem[] {
  const base = createLeernavigatorItems(defs);
  if (!Array.isArray(v)) return base;
  const byId = new Map<string, Record<string, unknown>>();
  const byLabel = new Map<string, Record<string, unknown>>();
  for (const raw of v) {
    const o = obj(raw);
    if (str(o.id)) byId.set(str(o.id), o);
    if (str(o.label)) byLabel.set(str(o.label).trim().toLowerCase(), o);
  }
  return base.map((item) => {
    const saved = byId.get(item.id) ?? byLabel.get(item.label.trim().toLowerCase());
    if (!saved) return item;
    return { ...item, checked: Boolean(saved.checked), uren: str(saved.uren) };
  });
}

/* ------------------------------------------------------------------ */
/* Legacy (schema v1) migration: bijlage2_model → Leernavigator        */
/* ------------------------------------------------------------------ */

/** Legacy PoW checklist labels that have a direct Leernavigator equivalent. */
const LEGACY_BIJLAGE2_TO_LEERNAVIGATOR: Record<string, string> = {
  'opstellen verzorgd c.v.': 'cv',
  'opstellen verzorgd cv': 'cv',
  'schrijven open sollicitatiebrief': 'brief',
  'schrijven gesloten sollicitatiebrief': 'brief',
  'aanmelden bij en solliciteren via vacatureportal': 'portals',
  'linkedin gebruiken voor netwerken en solliciteren': 'linkedin',
  'netwerkgesprek voorbereiden en voeren': 'netwerkgesprek',
  'sollicitatiegesprek voorbereiden en voeren': 'sollicitatiegesprek',
  'verbetering pc-vaardigheden': 'pc',
  'verbetering nederlandse taal': 'taal',
  'arbeidsgerelateerde webinars': 'webinars',
  'inzicht in persoonsprofiel': 'persoonsprofiel',
  'inzicht in zoekprofiel': 'zoekprofiel',
  'inzicht in interesses, talenten en valkuilen': 'talenten',
  'kennis welke beroepen passend zijn': 'type_beroepen',
  'denken in kansen en mogelijkheden': 'kansen_denken',
  'iets proberen om te ervaren of het passend is': 'kans_geven',
  'sollicitatieactiviteit (1 x per week)': 'sollicitatie_week',
  '(werk)ervaring opgedaan via een werkervaringsplaats/ stage (wep)': 'wep',
  '(werk)ervaring opgedaan via een werkervaringsplaats/stage (wep)': 'wep',
  '(werk)ervaring via stage/wep': 'wep',
};

export function migrateLegacyBijlage2ToLeernavigator(
  legacyModel: unknown,
  basis: VGRLeernavigatorItem[]
): VGRLeernavigatorItem[] {
  const m = obj(legacyModel);
  const checkedIds = new Set<string>();
  for (const group of ['willen', 'weten', 'kunnen', 'doen']) {
    const rows = Array.isArray(m[group]) ? (m[group] as Record<string, unknown>[]) : [];
    for (const row of rows) {
      if (!row || !row.checked) continue;
      const key = str(row.label).trim().toLowerCase().replace(/\s+/g, ' ');
      const target = LEGACY_BIJLAGE2_TO_LEERNAVIGATOR[key];
      if (target) checkedIds.add(target);
    }
  }
  if (checkedIds.size === 0) return basis;
  return basis.map((item) => (checkedIds.has(item.id) ? { ...item, checked: true } : item));
}

/* ------------------------------------------------------------------ */
/* Meta / body / planning / applications                               */
/* ------------------------------------------------------------------ */

export function normalizeVgrMeta(v: unknown): VGRMeta {
  const o = obj(v);
  const dismissedRaw = obj(o.dismissed_warnings);
  const dismissed: Record<string, string> = {};
  for (const [k, val] of Object.entries(dismissedRaw)) dismissed[k] = str(val);
  const version = Number(o.version);
  return {
    schema_version: VGR_SCHEMA_VERSION,
    period_start: str(o.period_start),
    period_end: str(o.period_end),
    report_date: str(o.report_date),
    linked_tp_instance_id: str(o.linked_tp_instance_id) || null,
    prior_vgr_instance_id: str(o.prior_vgr_instance_id) || null,
    prior_vgr_export_id: str(o.prior_vgr_export_id) || null,
    version: Number.isFinite(version) && version >= 1 ? Math.floor(version) : 1,
    source_document_ids: strArr(o.source_document_ids),
    dismissed_warnings: dismissed,
    approved_at: str(o.approved_at) || null,
  };
}

export function normalizeVgrBody(v: unknown, legacy?: Record<string, unknown>): VGRBody {
  const o = obj(v);
  const bm = obj(o.benutbare_mogelijkheden);
  const pb = obj(o.praktische_belemmeringen);
  const dt = obj(o.doelstelling_traject);
  const pp = obj(o.persoonlijk_profiel);
  const bp = obj(o.belastbaarheidsprofiel);
  const bb = obj(o.bijstellingen_belastbaarheid);
  const wd = obj(o.wijzigingen_doelstelling);
  const zp = obj(o.zoekprofiel);
  const ih = obj(o.inzet_houding);
  const ko = obj(o.kwaliteiten_onderzoek);
  const pow = obj(o.pow);
  const vp = obj(o.visie_plaatsbaarheid);
  const ln = obj(o.leernavigator);

  const kansen = str(vp.kansen);
  const kansenSafe: VGRBody['visie_plaatsbaarheid']['kansen'] =
    kansen === 'zeer_onwaarschijnlijk' || kansen === 'matig' || kansen === 'voldoende' || kansen === 'goed'
      ? kansen
      : '';

  let basis = leernavigator(ln.basis, VGR_LEERNAVIGATOR_BASIS_DEFS);
  if (legacy?.bijlage2_model && !Array.isArray(ln.basis)) {
    basis = migrateLegacyBijlage2ToLeernavigator(legacy.bijlage2_model, basis);
  }

  const history = goalHistory(dt.history);
  const wijzigingAanwezig = jaNee(wd.aanwezig);

  return {
    periode_tekst_override: str(o.periode_tekst_override),
    benutbare_mogelijkheden: {
      heeft: jaNee(bm.heeft),
      prognose: quote(bm.prognose),
      conclusie: quote(bm.conclusie),
      advies: quote(bm.advies),
      eerdere_prognose: str(bm.eerdere_prognose),
    },
    praktische_belemmeringen: { aanwezig: jaNee(pb.aanwezig), toelichting: str(pb.toelichting) },
    doelstelling_traject: {
      huidige: doel(dt.huidige),
      bij_intake: doel(dt.bij_intake),
      history,
      toelichting: str(dt.toelichting),
    },
    persoonlijk_profiel: { tekst: str(pp.tekst) },
    belastbaarheidsprofiel: {
      kind: kind(bp.kind),
      datum: str(bp.datum),
      auteur: str(bp.auteur),
      rubrieken: rubrieken(bp.rubrieken),
      toelichting: str(bp.toelichting),
    },
    bijstellingen_belastbaarheid: {
      aanwezig: jaNee(bb.aanwezig),
      revisions: revisions(bb.revisions),
      toelichting_geen: str(bb.toelichting_geen),
    },
    wijzigingen_doelstelling: {
      aanwezig: wijzigingAanwezig === null && history.some((h) => h.changed) ? true : wijzigingAanwezig,
      toelichting: str(wd.toelichting),
    },
    zoekprofiel: { tekst: str(zp.tekst) },
    inzet_houding: { werkt_mee: jaNee(ih.werkt_mee), toelichting: str(ih.toelichting) },
    interventies_motivatie: normalizeInterventionSection(o.interventies_motivatie, VGR_MOTIVATIE_OPTIONS),
    kwaliteiten_onderzoek: {
      ...normalizeInterventionSection(ko, VGR_KWALITEITEN_OPTIONS),
      persoonlijkheid_scores: scores(ko.persoonlijkheid_scores),
      persoonlijkheid_teksten: scores(ko.persoonlijkheid_teksten),
      beroepen: strArr(ko.beroepen),
      beroepen_conclusie: str(ko.beroepen_conclusie),
    },
    scholing: normalizeInterventionSection(o.scholing, VGR_SCHOLING_OPTIONS),
    sollicitatie_vaardigheden: normalizeInterventionSection(o.sollicitatie_vaardigheden, VGR_SOLLICITATIE_OPTIONS),
    interventies_activatie: normalizeInterventionSection(o.interventies_activatie, VGR_ACTIVATIE_OPTIONS),
    pow: {
      intake_trede: trede(pow.intake_trede),
      huidige_trede: trede(pow.huidige_trede),
      doel_trede: trede(pow.doel_trede),
      doel_onbekend: Boolean(pow.doel_onbekend),
      werkzame_uren: str(pow.werkzame_uren),
      werkzame_uren_context: str(pow.werkzame_uren_context),
      history: powHistory(pow.history),
      confirmed: Boolean(pow.confirmed),
    },
    visie_plaatsbaarheid: {
      ad: quote(vp.ad),
      kansen: kansenSafe,
      functies: strArr(vp.functies),
      conclusie: str(vp.conclusie),
    },
    leernavigator: {
      basis,
      activering: leernavigator(ln.activering, VGR_LEERNAVIGATOR_ACTIVERING_DEFS),
    },
  };
}

export function normalizePlanningPhases(
  v: unknown,
  startDate?: string | null,
  endDate?: string | null
): VGRPlanningPhase[] {
  if (!Array.isArray(v) || v.length === 0) return createDefaultPlanningPhases(startDate, endDate);
  return v
    .map((raw, idx) => {
      const o = obj(raw);
      const id = str(o.id) || `fase${idx + 1}`;
      const acts = Array.isArray(o.activities) ? (o.activities as unknown[]) : [];
      return {
        id,
        title: str(o.title) || `Planning fase ${idx + 1}`,
        goal: str(o.goal),
        period_from: str(o.period_from),
        period_to: str(o.period_to),
        activities: acts.map((a, i) => {
          const ao = obj(a);
          return {
            id: str(ao.id) || `${id}_a${i + 1}`,
            name: str(ao.name),
            status: normalizePlanningStatus(ao.status),
            note: str(ao.note),
          };
        }),
      };
    });
}

export function normalizeApplications(v: unknown): VGRApplication[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => obj(raw))
    .map((o) => {
      const date = str(o.date);
      const monthKey = str(o.month_key) || monthKeyFromDate(date);
      return {
        id: str(o.id) || newVgrId('app'),
        date,
        month_key: monthKey,
        type: str(o.type),
        functie: str(o.functie),
        organisatie: str(o.organisatie),
        status: str(o.status),
        note: str(o.note),
      };
    })
    .sort((a, b) => {
      const m = (a.month_key || '').localeCompare(b.month_key || '');
      if (m !== 0) return m;
      return (a.date || '').localeCompare(b.date || '');
    });
}

function normalizeProposals(v: unknown): Record<string, VGRAiProposal> {
  const o = obj(v);
  const out: Record<string, VGRAiProposal> = {};
  for (const [k, raw] of Object.entries(o)) {
    const p = obj(raw);
    const status = str(p.status);
    out[k] = {
      section_id: str(p.section_id) || k,
      generated_at: str(p.generated_at),
      patch: obj(p.patch),
      evidence: strArr(p.evidence),
      notes: strArr(p.notes),
      status: status === 'applied' || status === 'rejected' ? status : 'proposed',
    };
  }
  return out;
}

function normalizeTestSummaries(v: unknown): VGRTestSummary[] {
  if (!Array.isArray(v)) return [];
  return v.map((raw) => {
    const o = obj(raw);
    const status = str(o.status);
    return {
      id: str(o.id) || newVgrId('test'),
      generated_at: str(o.generated_at),
      source_document_ids: strArr(o.source_document_ids),
      tests_present: strArr(o.tests_present),
      summary_text: str(o.summary_text),
      personality_scores: o.personality_scores ? scores(o.personality_scores) : null,
      occupations: strArr(o.occupations),
      status: status === 'inserted' || status === 'rejected' ? status : 'draft',
    };
  });
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

const LEGACY_KEYS = ['bijlage2_model', 'bijlage3_decisions', 'bijlage3_page2'] as const;

/**
 * Normalize any stored payload (v1 stub or v2) into the complete VGR shape.
 * Idempotent; never drops adviser prose. Legacy stub keys are migrated then removed.
 */
export function ensureVGRShape(raw: Record<string, any>): VGRData {
  const next: Record<string, any> = { ...(raw || {}) };

  if (typeof next.first_name === 'string') next.first_name = normalizePersonName(next.first_name) ?? '';
  if (typeof next.last_name === 'string') next.last_name = normalizePersonName(next.last_name) ?? '';

  const legacy: Record<string, unknown> = {};
  for (const k of LEGACY_KEYS) {
    if (next[k] !== undefined) {
      legacy[k] = next[k];
      delete next[k];
    }
  }

  const meta = normalizeVgrMeta(next.vgr_meta);
  // Report date defaults to today for a new report; cover shows report-specific date.
  if (!meta.report_date) {
    meta.report_date = new Date().toISOString().slice(0, 10);
  }

  const body = normalizeVgrBody(next.body, legacy);
  const planning = normalizePlanningPhases(next.planning_phases, next.tp_start_date, next.tp_end_date);
  const applications = normalizeApplications(next.applications);

  return {
    ...next,
    vgr_meta: meta,
    body,
    planning_phases: planning,
    applications,
    ai_proposals: normalizeProposals(next.ai_proposals),
    test_summaries: normalizeTestSummaries(next.test_summaries),
  } as VGRData;
}

/** True when the draft has no adviser content yet (safe to re-hydrate from TP/employee). */
export function vgrDraftIsEmpty(data: Record<string, unknown>): boolean {
  const shaped = ensureVGRShape(data as Record<string, any>);
  const b = shaped.body;
  const texts = [
    b.persoonlijk_profiel.tekst,
    b.zoekprofiel.tekst,
    b.inzet_houding.toelichting,
    b.doelstelling_traject.toelichting,
    b.praktische_belemmeringen.toelichting,
    b.visie_plaatsbaarheid.conclusie,
    ...b.pow.history.map((h) => h.toelichting),
  ];
  if (texts.some((t) => t.trim().length > 0)) return false;
  if (shaped.applications.length > 0) return false;
  const anySelected = [
    b.interventies_motivatie,
    b.kwaliteiten_onderzoek,
    b.scholing,
    b.sollicitatie_vaardigheden,
    b.interventies_activatie,
  ].some((s) => s.selected.length > 0);
  if (anySelected) return false;
  if (b.leernavigator.basis.some((i) => i.checked) || b.leernavigator.activering.some((i) => i.checked)) return false;
  return true;
}
