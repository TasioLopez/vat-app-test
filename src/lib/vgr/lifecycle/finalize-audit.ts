/**
 * Phase 3 finalize gates + audit (pack §7 / T20).
 * Stamps prompt/template/fact versions on Definitief vaststellen.
 * D05: PDF-only — no DOCX-out; audit still records template_version for the PDF layout.
 */
import { VGR_APPROVED_RULES_VERSION } from '@/lib/vgr/ai/style-prompt';
import { countIssues, validateVgr, visibleIssues } from '@/lib/vgr/validation';
import type { VGRData, VGRFinalizeAudit, VGRReportType, VGRStatus } from '@/lib/vgr/schema';
import { lockedModuleIds } from './manual-lock';

/** PDF layout / house-style carrier version (D05). Bump when print layout materially changes. */
export const VGR_TEMPLATE_VERSION = 'vgr-pdf-2026-11-25-p3';

export type FinalizeGateResult = {
  ok: boolean;
  blockers: string[];
  warnings: string[];
};

/** Hard gates before status → final. Soft warnings do not block. */
export function evaluateFinalizeGates(data: VGRData): FinalizeGateResult {
  const all = validateVgr(data);
  const visible = visibleIssues(all, data.vgr_meta.dismissed_warnings);
  const blockers = visible.filter((i) => i.level === 'error').map((i) => i.message);
  const warnings = visible.filter((i) => i.level === 'warning').map((i) => i.message);
  return { ok: blockers.length === 0, blockers, warnings };
}

export function buildFinalizeAudit(params: {
  data: VGRData;
  userId?: string | null;
  factSnapshot?: string | null;
  now?: string;
}): VGRFinalizeAudit {
  const { data, userId, factSnapshot = null } = params;
  const now = params.now ?? new Date().toISOString();
  const reportType: VGRReportType =
    data.vgr_meta.report_type || (data.vgr_meta.version >= 2 ? 'VGR_FOLLOWUP' : 'VGR1');
  return {
    finalized_at: now,
    finalized_by: userId ?? null,
    approved_rules_version: data.vgr_meta.approved_rules_version || VGR_APPROVED_RULES_VERSION,
    template_version: data.vgr_meta.template_version || VGR_TEMPLATE_VERSION,
    report_type: reportType,
    source_document_ids: [...(data.vgr_meta.source_document_ids ?? [])],
    locked_module_ids: lockedModuleIds(data),
    dismissed_warning_ids: Object.keys(data.vgr_meta.dismissed_warnings ?? {}),
    fact_snapshot: factSnapshot,
  };
}

/**
 * Apply finalize audit onto draft data when moving to `final`.
 * Clears audit when reverting away from final.
 */
export function applyStatusWithAudit(
  data: VGRData,
  nextStatus: VGRStatus,
  opts?: { userId?: string | null; factSnapshot?: string | null },
): { data: VGRData; gate: FinalizeGateResult } {
  if (nextStatus === 'final') {
    const gate = evaluateFinalizeGates(data);
    if (!gate.ok) {
      return { data, gate };
    }
    const audit = buildFinalizeAudit({
      data,
      userId: opts?.userId,
      factSnapshot: opts?.factSnapshot,
    });
    const next: VGRData = {
      ...data,
      vgr_meta: {
        ...data.vgr_meta,
        approved_at: audit.finalized_at,
        approved_rules_version: audit.approved_rules_version,
        template_version: audit.template_version,
        finalize_audit: audit,
      },
    };
    return { data: next, gate };
  }

  const next: VGRData = {
    ...data,
    vgr_meta: {
      ...data.vgr_meta,
      approved_at: null,
      finalize_audit: null,
    },
  };
  return { data: next, gate: { ok: true, blockers: [], warnings: [] } };
}

/** Compact issue counts for UI / tests. */
export function finalizeIssueCounts(data: VGRData) {
  const visible = visibleIssues(validateVgr(data), data.vgr_meta.dismissed_warnings);
  return countIssues(visible);
}
