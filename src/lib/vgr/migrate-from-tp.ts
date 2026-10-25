/**
 * Hydration of a VGR draft from existing dossier data.
 *
 * Sources (in priority order, never overwriting adviser-entered VGR data):
 *  1. prior final VGR snapshot (follow-up reports carry history forward)
 *  2. TP 2026 draft/final data_json (gegevens + body prose + planning)
 *  3. employee / employee_details / tp_meta master records
 *
 * All copies are report-specific snapshots: nothing here mutates TP or employee rows.
 */
import { ensureVGRShape, vgrDraftIsEmpty } from '@/lib/vgr/mapping';
import { mergeRecordFillBlanks } from '@/lib/tp2026/gegevens-autofill';
import { parsePowInschaling, parsePowToelichting } from '@/lib/tp/pow-meter/build-fields';
import { planningFromTpBijlage1 } from '@/lib/vgr/planning-defaults';
import {
  newVgrId,
  type VGRBelastbaarheidKind,
  type VGRData,
  type VGRPowTrede,
  type VGRTrajectDoel,
} from '@/lib/vgr/schema';

/** Flat gegevens keys shared 1:1 between TP 2026 and VGR (01 + 02). */
export const VGR_GEGEVENS_KEYS_FROM_TP = [
  'first_name',
  'last_name',
  'gender',
  'phone',
  'email',
  'date_of_birth',
  'first_sick_day',
  'registration_date',
  'intake_date',
  'tp_creation_date',
  'has_ad_report',
  'ad_report_concept',
  'is_ex_werknemer',
  'ad_report_date',
  'occupational_doctor_name',
  'occupational_doctor_org',
  'fml_izp_lab_kind',
  'fml_izp_lab_date',
  'consultant_name',
  'consultant_user_id',
  'consultant_phone',
  'consultant_email',
  'document_employer_name',
  'document_referent_name',
  'document_referent_phone',
  'document_referent_email',
  'document_referent_function',
  'document_referent_gender',
  'current_job',
  'work_experience',
  'education_level',
  'education_name',
  'drivers_license',
  'drivers_license_type',
  'transport_type',
  'dutch_speaking',
  'dutch_writing',
  'dutch_reading',
  'has_computer',
  'computer_skills',
  'computer_skills_description',
  'contract_hours',
  'other_employers',
  'tp_lead_time',
  'tp_start_date',
  'tp_end_date',
] as const;

/** Legacy stub keys — exposed for the old test suite / migration path. */
const LEGACY_BIJLAGE_KEYS = ['bijlage2_model', 'bijlage3_decisions', 'bijlage3_page2'] as const;

export function extractBijlagenFromTp2026(tpData: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of LEGACY_BIJLAGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(tpData, key) && tpData[key] !== undefined) {
      out[key] = tpData[key];
    }
  }
  return out;
}

export function hydrateVgrEmployeeFields(
  employee: Record<string, unknown> | null | undefined,
  details: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (employee?.first_name) out.first_name = employee.first_name;
  if (employee?.last_name) out.last_name = employee.last_name;
  if (employee?.email) out.email = employee.email;
  if (details) {
    for (const [k, v] of Object.entries(details)) {
      if (k === 'employee_id' || k === 'id' || k === 'created_at' || k === 'updated_at') continue;
      if (v !== null && v !== undefined && v !== '') out[k] = v;
    }
  }
  return out;
}

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

function tredeFromText(v: unknown): VGRPowTrede {
  const m = /([1-6])/.exec(String(v || ''));
  return m ? (Number(m[1]) as VGRPowTrede) : null;
}

function kindFromTp(v: unknown): VGRBelastbaarheidKind {
  const s = String(v || '').trim().toLowerCase();
  return s === 'fml' || s === 'izp' || s === 'lab' ? s : '';
}

/** Guess the traject goal at intake from TP prose (adviser confirms in the editor). */
function goalFromTp(tp: Record<string, unknown>): VGRTrajectDoel {
  const text = `${tp.visie_loopbaanadviseur || ''} ${tp.zoekprofiel || ''}`.toLowerCase();
  if (text.includes('betaald werk') || text.includes('betaalde baan')) return 'betaald_werk';
  if (text.includes('activering')) return 'activering';
  if (text.includes('oriënt') || text.includes('orient')) return 'arbeidsmarkt_orientatie';
  return '';
}

/**
 * Copy TP 2026 content into an (already shaped) VGR draft. Only fills blanks.
 */
export function hydrateVgrFromTp2026(
  draft: VGRData,
  tpData: Record<string, unknown> | null | undefined,
  tpInstanceId?: string | null
): VGRData {
  if (!tpData) return draft;
  const next: VGRData = { ...draft, body: structuredClone(draft.body), vgr_meta: { ...draft.vgr_meta } };

  // 1. flat gegevens
  const merged = mergeRecordFillBlanks(next as Record<string, unknown>, tpData, VGR_GEGEVENS_KEYS_FROM_TP);
  Object.assign(next, merged);

  if (!next.vgr_meta.linked_tp_instance_id && tpInstanceId) {
    next.vgr_meta.linked_tp_instance_id = tpInstanceId;
  }
  if (isBlank(next.vgr_meta.period_start) && !isBlank(tpData.tp_start_date)) {
    next.vgr_meta.period_start = String(tpData.tp_start_date);
  }

  const b = next.body;

  // 2. body prose (snapshot copies; adviser updates for the reporting period)
  if (isBlank(b.persoonlijk_profiel.tekst) && !isBlank(tpData.persoonlijk_profiel)) {
    b.persoonlijk_profiel.tekst = String(tpData.persoonlijk_profiel);
  }
  if (isBlank(b.zoekprofiel.tekst) && !isBlank(tpData.zoekprofiel)) {
    b.zoekprofiel.tekst = String(tpData.zoekprofiel);
  }
  if (isBlank(b.praktische_belemmeringen.toelichting) && !isBlank(tpData.praktische_belemmeringen)) {
    b.praktische_belemmeringen.toelichting = String(tpData.praktische_belemmeringen);
    if (b.praktische_belemmeringen.aanwezig === null) {
      const lower = String(tpData.praktische_belemmeringen).toLowerCase();
      b.praktische_belemmeringen.aanwezig = !/geen (praktische )?belemmeringen/.test(lower);
    }
  }
  if (isBlank(b.belastbaarheidsprofiel.toelichting) && !isBlank(tpData.prognose_bedrijfsarts)) {
    b.belastbaarheidsprofiel.toelichting = String(tpData.prognose_bedrijfsarts);
  }
  if (!b.belastbaarheidsprofiel.kind) b.belastbaarheidsprofiel.kind = kindFromTp(tpData.fml_izp_lab_kind);
  if (isBlank(b.belastbaarheidsprofiel.datum) && !isBlank(tpData.fml_izp_lab_date)) {
    b.belastbaarheidsprofiel.datum = String(tpData.fml_izp_lab_date);
  }
  if (isBlank(b.belastbaarheidsprofiel.auteur) && !isBlank(tpData.occupational_doctor_org)) {
    b.belastbaarheidsprofiel.auteur = String(tpData.occupational_doctor_org);
  }
  if (isBlank(b.visie_plaatsbaarheid.ad.citaat) && !isBlank(tpData.advies_ad_passende_arbeid)) {
    b.visie_plaatsbaarheid.ad.citaat = String(tpData.advies_ad_passende_arbeid);
    b.visie_plaatsbaarheid.ad.bron_type = 'AD-rapport';
    if (isBlank(b.visie_plaatsbaarheid.ad.bron_naam)) {
      b.visie_plaatsbaarheid.ad.bron_naam = String(tpData.occupational_doctor_name || '');
    }
    if (isBlank(b.visie_plaatsbaarheid.ad.bron_datum)) {
      b.visie_plaatsbaarheid.ad.bron_datum = String(tpData.ad_report_date || '');
    }
  }
  if (isBlank(b.visie_plaatsbaarheid.conclusie) && !isBlank(tpData.visie_loopbaanadviseur)) {
    b.visie_plaatsbaarheid.conclusie = String(tpData.visie_loopbaanadviseur);
  }
  if (!b.doelstelling_traject.bij_intake) {
    b.doelstelling_traject.bij_intake = goalFromTp(tpData);
  }
  if (!b.doelstelling_traject.huidige && b.doelstelling_traject.bij_intake) {
    b.doelstelling_traject.huidige = b.doelstelling_traject.bij_intake;
  }

  // 3. POW-meter: TP intake inschaling becomes the "bij intake" measurement
  const powRaw = String(tpData.pow_meter || '');
  if (powRaw && b.pow.intake_trede === null) {
    const inschaling = parsePowInschaling(powRaw);
    if (inschaling) {
      b.pow.intake_trede = tredeFromText(inschaling.huidige_trede);
      if (isBlank(b.pow.werkzame_uren_context)) b.pow.werkzame_uren_context = inschaling.werkzame_uren;
      const doelTrede = tredeFromText(inschaling.verwachting);
      if (b.pow.doel_trede === null && doelTrede) b.pow.doel_trede = doelTrede;
    }
    const toelichting = parsePowToelichting(powRaw);
    if (toelichting && b.pow.history.length === 0) {
      b.pow.history.push({
        id: newVgrId('pow'),
        date: String(tpData.intake_date || tpData.tp_creation_date || ''),
        toelichting,
      });
    }
    if (b.pow.huidige_trede === null && b.pow.intake_trede !== null) {
      b.pow.huidige_trede = b.pow.intake_trede;
    }
  }

  // 4. planning from Bijlage 1 (statuses carried over; adviser updates progress)
  const planningIsDefault = next.planning_phases.every((p) =>
    p.activities.every((a) => a.status === 'P' && !a.note)
  );
  if (planningIsDefault) {
    const fromTp = planningFromTpBijlage1(
      tpData.bijlage1_phases,
      String(next.tp_start_date || next.intake_date || ''),
      String(next.tp_end_date || '')
    );
    if (fromTp) next.planning_phases = fromTp;
  }

  return next;
}

/**
 * Follow-up report: copy history + stable sections from the prior final VGR snapshot.
 * Period-specific fields (applications, period dates, inzet, interventions) start empty.
 */
export function hydrateVgrFromPriorReport(
  draft: VGRData,
  prior: Record<string, unknown> | null | undefined,
  priorInstanceId?: string | null,
  priorExportId?: string | null
): VGRData {
  if (!prior) return draft;
  const prev = ensureVGRShape(prior as Record<string, any>);
  const next: VGRData = { ...draft, body: structuredClone(draft.body), vgr_meta: { ...draft.vgr_meta } };

  const merged = mergeRecordFillBlanks(next as Record<string, unknown>, prev, VGR_GEGEVENS_KEYS_FROM_TP);
  Object.assign(next, merged);

  next.vgr_meta.prior_vgr_instance_id = next.vgr_meta.prior_vgr_instance_id || priorInstanceId || null;
  next.vgr_meta.prior_vgr_export_id = next.vgr_meta.prior_vgr_export_id || priorExportId || null;
  next.vgr_meta.linked_tp_instance_id = next.vgr_meta.linked_tp_instance_id || prev.vgr_meta.linked_tp_instance_id;
  next.vgr_meta.version = Math.max(next.vgr_meta.version, (prev.vgr_meta.version || 1) + 1);
  if (isBlank(next.vgr_meta.period_start) && prev.vgr_meta.period_end) {
    next.vgr_meta.period_start = prev.vgr_meta.period_end;
  }

  const b = next.body;
  const pb = prev.body;

  // Stable sections (carry forward, adviser edits)
  if (isBlank(b.persoonlijk_profiel.tekst)) b.persoonlijk_profiel.tekst = pb.persoonlijk_profiel.tekst;
  if (isBlank(b.zoekprofiel.tekst)) b.zoekprofiel.tekst = pb.zoekprofiel.tekst;
  if (isBlank(b.praktische_belemmeringen.toelichting)) {
    b.praktische_belemmeringen = { ...pb.praktische_belemmeringen };
  }
  if (isBlank(b.belastbaarheidsprofiel.toelichting)) b.belastbaarheidsprofiel = { ...pb.belastbaarheidsprofiel };
  if (isBlank(b.visie_plaatsbaarheid.ad.citaat)) b.visie_plaatsbaarheid.ad = { ...pb.visie_plaatsbaarheid.ad };
  if (!b.visie_plaatsbaarheid.kansen) b.visie_plaatsbaarheid.kansen = pb.visie_plaatsbaarheid.kansen;
  if (b.visie_plaatsbaarheid.functies.length === 0) b.visie_plaatsbaarheid.functies = [...pb.visie_plaatsbaarheid.functies];
  if (isBlank(b.visie_plaatsbaarheid.conclusie)) b.visie_plaatsbaarheid.conclusie = pb.visie_plaatsbaarheid.conclusie;

  // History (append-only)
  if (!b.doelstelling_traject.bij_intake) b.doelstelling_traject.bij_intake = pb.doelstelling_traject.bij_intake;
  if (!b.doelstelling_traject.huidige) b.doelstelling_traject.huidige = pb.doelstelling_traject.huidige;
  if (b.doelstelling_traject.history.length === 0) b.doelstelling_traject.history = [...pb.doelstelling_traject.history];
  if (b.bijstellingen_belastbaarheid.revisions.length === 0) {
    b.bijstellingen_belastbaarheid.revisions = [...pb.bijstellingen_belastbaarheid.revisions];
  }
  if (b.pow.intake_trede === null) b.pow.intake_trede = pb.pow.intake_trede;
  if (b.pow.huidige_trede === null) b.pow.huidige_trede = pb.pow.huidige_trede;
  if (b.pow.doel_trede === null) {
    b.pow.doel_trede = pb.pow.doel_trede;
    b.pow.doel_onbekend = pb.pow.doel_onbekend;
  }
  if (b.pow.history.length === 0) b.pow.history = [...pb.pow.history];
  if (isBlank(b.benutbare_mogelijkheden.eerdere_prognose) && pb.benutbare_mogelijkheden.prognose.citaat) {
    b.benutbare_mogelijkheden.eerdere_prognose = pb.benutbare_mogelijkheden.prognose.citaat;
  }

  // Tests / qualities carry forward (one-off interventions stay visible in follow-ups)
  if (b.kwaliteiten_onderzoek.selected.length === 0 && pb.kwaliteiten_onderzoek.selected.length > 0) {
    b.kwaliteiten_onderzoek = structuredClone(pb.kwaliteiten_onderzoek);
  }

  // Leernavigator checks are cumulative
  const prevBasis = new Map(pb.leernavigator.basis.map((i) => [i.id, i]));
  b.leernavigator.basis = b.leernavigator.basis.map((i) => {
    const p = prevBasis.get(i.id);
    return p && p.checked && !i.checked ? { ...i, checked: true, uren: i.uren || p.uren } : i;
  });
  const prevAct = new Map(pb.leernavigator.activering.map((i) => [i.id, i]));
  b.leernavigator.activering = b.leernavigator.activering.map((i) => {
    const p = prevAct.get(i.id);
    return p && p.checked && !i.checked ? { ...i, checked: true, uren: i.uren || p.uren } : i;
  });

  // Planning statuses carry forward
  const planningIsDefault = next.planning_phases.every((p) => p.activities.every((a) => a.status === 'P' && !a.note));
  if (planningIsDefault && prev.planning_phases.length > 0) {
    next.planning_phases = structuredClone(prev.planning_phases);
  }

  return next;
}

export type VgrHydrationSources = {
  tpData?: Record<string, unknown> | null;
  tpInstanceId?: string | null;
  employee?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
  tpMeta?: Record<string, unknown> | null;
  priorReport?: Record<string, unknown> | null;
  priorInstanceId?: string | null;
  priorExportId?: string | null;
};

/**
 * Build the initial VGR draft (or top up an empty one). Existing VGR content always wins.
 */
export function buildVgrInitialData(
  existing: Record<string, unknown>,
  sources: VgrHydrationSources
): VGRData {
  let draft = ensureVGRShape(existing as Record<string, any>);

  // Master records (fill blanks only). tp_creation_date is TP-specific; VGR uses report_date.
  const meta = { ...(sources.tpMeta || {}) };
  delete (meta as Record<string, unknown>).tp_creation_date;
  delete (meta as Record<string, unknown>).id;
  delete (meta as Record<string, unknown>).employee_id;
  let flat = mergeRecordFillBlanks(
    draft as Record<string, unknown>,
    hydrateVgrEmployeeFields(sources.employee, sources.details)
  );
  flat = mergeRecordFillBlanks(flat, meta);
  draft = ensureVGRShape(flat as Record<string, any>);

  draft = hydrateVgrFromPriorReport(draft, sources.priorReport, sources.priorInstanceId, sources.priorExportId);
  draft = hydrateVgrFromTp2026(draft, sources.tpData, sources.tpInstanceId);

  return ensureVGRShape(draft);
}

/** Backwards-compatible wrapper used by the original entry page / tests. */
export function mergeVgrInitialData(
  existing: Record<string, unknown>,
  tpData: Record<string, unknown> | null | undefined,
  employee: Record<string, unknown> | null | undefined,
  details: Record<string, unknown> | null | undefined
): VGRData {
  return buildVgrInitialData(existing, { tpData, employee, details });
}

export { vgrDraftIsEmpty };
