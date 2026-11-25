/**
 * Phase 3 / G11: Concept-VGR maken — period/type defaults (D01: still proposals until Overnemen).
 * WIA_FINAL is reserved (D08) and not offered in the entry UI.
 */
import type { VGRData, VGRReportType } from '@/lib/vgr/schema';
import { VGR_APPROVED_RULES_VERSION } from '@/lib/vgr/ai/style-prompt';
import { VGR_TEMPLATE_VERSION } from './finalize-audit';

export type ConceptVgrDefaults = {
  report_type: Exclude<VGRReportType, 'WIA_FINAL'>;
  version: number;
  period_start: string;
  period_end: string;
  report_date: string;
  approved_rules_version: string;
  template_version: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Derive report type / version / period defaults for a new or existing concept.
 * Follow-up when a prior final VGR is linked; otherwise VGR1.
 */
export function resolveConceptVgrDefaults(data: VGRData): ConceptVgrDefaults {
  const meta = data.vgr_meta;
  const hasPrior = Boolean(meta.prior_vgr_instance_id);
  const version = Math.max(1, meta.version || (hasPrior ? 2 : 1));
  const report_type: ConceptVgrDefaults['report_type'] =
    meta.report_type === 'VGR_FOLLOWUP' || version >= 2 || hasPrior ? 'VGR_FOLLOWUP' : 'VGR1';

  const report_date = meta.report_date || todayIso();
  let period_start = meta.period_start;
  let period_end = meta.period_end;

  // Soft defaults: if empty, use TP window or a 3-month window ending on report_date.
  if (!period_end) period_end = report_date;
  if (!period_start) {
    const tpStart = String((data as Record<string, unknown>).tp_start_date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(tpStart)) {
      period_start = tpStart;
    } else {
      const d = new Date(`${report_date}T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() - 3);
      period_start = d.toISOString().slice(0, 10);
    }
  }

  return {
    report_type,
    version: report_type === 'VGR1' ? 1 : Math.max(version, 2),
    period_start,
    period_end,
    report_date,
    approved_rules_version: meta.approved_rules_version || VGR_APPROVED_RULES_VERSION,
    template_version: meta.template_version || VGR_TEMPLATE_VERSION,
  };
}

/** Apply Concept-VGR defaults without wiping adviser prose (fill blanks / explicit type). */
export function applyConceptVgrDefaults(data: VGRData): VGRData {
  const defaults = resolveConceptVgrDefaults(data);
  return {
    ...data,
    vgr_meta: {
      ...data.vgr_meta,
      report_type: defaults.report_type,
      version: defaults.version,
      period_start: data.vgr_meta.period_start || defaults.period_start,
      period_end: data.vgr_meta.period_end || defaults.period_end,
      report_date: data.vgr_meta.report_date || defaults.report_date,
      approved_rules_version: defaults.approved_rules_version,
      template_version: defaults.template_version,
    },
  };
}

export function conceptVgrReportTypeLabel(type: VGRReportType | undefined): string {
  if (type === 'VGR_FOLLOWUP') return 'Vervolg-VGR (concept)';
  if (type === 'WIA_FINAL') return 'WIA / eindrapportage (later)';
  return 'VGR1 (concept)';
}
