/**
 * Phase 4 / G12 — WIA_FINAL scaffolding (D08: full WIA consult later).
 * Pack T22: cumulative navolgbare timeline from prior VGRs; no unfounded WIA consult.
 */
import type { VGRData, VGRReportType } from '@/lib/vgr/schema';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { VGR_APPROVED_RULES_VERSION } from '@/lib/vgr/ai/style-prompt';
import { VGR_TEMPLATE_VERSION } from '@/lib/vgr/lifecycle/finalize-audit';

export type VgrTimelineEntry = {
  /** Stable id (instance id or synthetic). */
  id: string;
  report_type: VGRReportType;
  version: number;
  period_start: string;
  period_end: string;
  report_date: string;
  /** Short label for UI / WRITE context. */
  label: string;
};

export type WiaScaffoldResult = {
  report_type: 'WIA_FINAL';
  version: number;
  timeline: VgrTimelineEntry[];
  /** Soft blockers — concept may proceed but WRITE must not invent WIA consult. */
  warnings: string[];
  /** Hard: cannot honestly claim a WIA consult without source evidence. */
  unfounded_wia_consult: boolean;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function entryFromReport(
  data: VGRData,
  id: string,
): VgrTimelineEntry {
  const type: VGRReportType =
    data.vgr_meta.report_type ||
    (data.vgr_meta.version >= 2 ? 'VGR_FOLLOWUP' : 'VGR1');
  const version = Math.max(1, data.vgr_meta.version || 1);
  const label =
    type === 'WIA_FINAL'
      ? `WIA / eindrapportage v${version}`
      : type === 'VGR_FOLLOWUP'
        ? `Vervolg-VGR v${version}`
        : `VGR1 v${version}`;
  return {
    id,
    report_type: type,
    version,
    period_start: data.vgr_meta.period_start || '',
    period_end: data.vgr_meta.period_end || '',
    report_date: data.vgr_meta.report_date || '',
    label,
  };
}

/**
 * Build a chronological timeline from prior finalized report snapshots + current draft.
 * Oldest first for navolgbare leesvolgorde (T22).
 */
export function buildVgrReportTimeline(params: {
  priorReports: Array<{ id: string; data: Record<string, unknown> | VGRData }>;
  current?: VGRData | null;
  currentId?: string;
}): VgrTimelineEntry[] {
  const entries: VgrTimelineEntry[] = params.priorReports.map((p) =>
    entryFromReport(ensureVGRShape(p.data as Record<string, unknown>), p.id),
  );
  if (params.current) {
    entries.push(entryFromReport(params.current, params.currentId || 'current'));
  }
  return entries.sort((a, b) => {
    const da = a.report_date || a.period_end || '';
    const db = b.report_date || b.period_end || '';
    if (da !== db) return da.localeCompare(db);
    return a.version - b.version;
  });
}

/**
 * Detect invented / unfounded WIA-consult claims in prose (T22 honesty).
 * Scaffold only — full WIA consult module lands later (D08).
 */
export function detectUnfoundedWiaConsult(text: string): boolean {
  const t = text.toLowerCase();
  if (!t.trim()) return false;
  const claimsConsult =
    /\bwia[-\s]?consult\b/.test(t) ||
    /\bconsultatie\s+wia\b/.test(t) ||
    /\buwv[-\s]?keuring\b/.test(t) ||
    /\bwia[-\s]?beoordeling\s+(heeft\s+plaatsgevonden|is\s+afgerond)\b/.test(t);
  if (!claimsConsult) return false;
  // Allow when explicitly marked as absent / planned / not yet.
  if (
    /\b(geen|nog\s+geen|niet\s+plaatsgevonden|niet\s+gedaan|gepland|later)\b.{0,40}\bwia\b/.test(t) ||
    /\bwia\b.{0,40}\b(geen|nog\s+geen|niet\s+plaatsgevonden|gepland)\b/.test(t)
  ) {
    return false;
  }
  return true;
}

/**
 * Scaffold a WIA / eindrapportage concept from prior VGRs (T22).
 * Does not invent WIA-consult content; flags unfounded claims in existing prose.
 */
export function scaffoldWiaFinalConcept(params: {
  draft: VGRData;
  priorReports: Array<{ id: string; data: Record<string, unknown> | VGRData }>;
}): WiaScaffoldResult {
  const draft = ensureVGRShape(params.draft as unknown as Record<string, unknown>);
  const timeline = buildVgrReportTimeline({
    priorReports: params.priorReports,
    current: null,
  });

  const maxPriorVersion = timeline.reduce((m, e) => Math.max(m, e.version), 0);
  const version = Math.max(draft.vgr_meta.version || 1, maxPriorVersion + 1, 2);

  const warnings: string[] = [];
  if (timeline.length === 0) {
    warnings.push(
      'Geen eerdere vastgestelde VGR’s in de tijdlijn — WIA-eindrapportage bouwt idealiter op eerdere rapportages (T22).',
    );
  }

  const proseBlob = [
    draft.body.visie_plaatsbaarheid.conclusie,
    draft.body.persoonlijk_profiel.tekst,
    draft.body.inzet_houding.toelichting,
    draft.body.zoekprofiel.tekst,
  ].join('\n');

  const unfounded = detectUnfoundedWiaConsult(proseBlob);
  if (unfounded) {
    warnings.push(
      'Tekst claimt een WIA-consult zonder geverifieerde bron — niet als feit overnemen (T22). Volledige WIA-consultmodule volgt later (D08).',
    );
  } else {
    warnings.push(
      'WIA_FINAL is een scaffold: modulevolgorde volgt VGR; geen apart goedgekeurd WIA-documentmodel tot D08 unlock.',
    );
  }

  return {
    report_type: 'WIA_FINAL',
    version,
    timeline,
    warnings,
    unfounded_wia_consult: unfounded,
  };
}

/** Apply WIA_FINAL scaffold onto draft meta without wiping adviser prose. */
export function applyWiaFinalScaffold(
  draft: VGRData,
  priorReports: Array<{ id: string; data: Record<string, unknown> | VGRData }>,
): { data: VGRData; scaffold: WiaScaffoldResult } {
  const scaffold = scaffoldWiaFinalConcept({ draft, priorReports });
  const lastPrior = priorReports.length
    ? ensureVGRShape(priorReports[priorReports.length - 1].data as Record<string, unknown>)
    : null;
  const report_date = draft.vgr_meta.report_date || todayIso();
  let period_start = draft.vgr_meta.period_start;
  let period_end = draft.vgr_meta.period_end || report_date;
  if (!period_start && lastPrior?.vgr_meta.period_end) {
    period_start = lastPrior.vgr_meta.period_end;
  }
  if (!period_start) {
    const d = new Date(`${report_date}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 3);
    period_start = d.toISOString().slice(0, 10);
  }

  const lastPriorId = priorReports.length ? priorReports[priorReports.length - 1].id : null;

  const data: VGRData = {
    ...draft,
    vgr_meta: {
      ...draft.vgr_meta,
      report_type: 'WIA_FINAL',
      version: scaffold.version,
      period_start: draft.vgr_meta.period_start || period_start,
      period_end: draft.vgr_meta.period_end || period_end,
      report_date,
      prior_vgr_instance_id: draft.vgr_meta.prior_vgr_instance_id || lastPriorId,
      approved_rules_version: draft.vgr_meta.approved_rules_version || VGR_APPROVED_RULES_VERSION,
      template_version: draft.vgr_meta.template_version || VGR_TEMPLATE_VERSION,
    },
  };

  return { data, scaffold };
}

/** Cover / Review title for report type. */
export function vgrCoverTitleForType(type: VGRReportType | undefined): string {
  if (type === 'WIA_FINAL') return 'WIA / eindrapportage';
  return 'Rapportage voortgang';
}

/** Plain-text timeline for WRITE context / Review. */
export function formatVgrTimelineText(timeline: VgrTimelineEntry[]): string {
  if (!timeline.length) return 'Geen eerdere rapportages in de tijdlijn.';
  return timeline
    .map((e, i) => {
      const period =
        e.period_start && e.period_end ? `${e.period_start} – ${e.period_end}` : e.report_date || 'periode onbekend';
      return `${i + 1}. ${e.label} (${period})`;
    })
    .join('\n');
}
