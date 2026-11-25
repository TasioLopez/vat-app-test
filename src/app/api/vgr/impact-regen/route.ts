import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { computeImpactedModules } from '@/lib/vgr/lifecycle';
import { loadVgrDossier } from '@/lib/vgr/dossier/store';
import type { VgrAssertion } from '@/lib/vgr/dossier/types';
import type { VGRData } from '@/lib/vgr/schema';

export const runtime = 'nodejs';

/**
 * POST /api/vgr/impact-regen
 * Body: { employeeId, vgrInstanceId, data?, changedClaimIds?, since? }
 *
 * Computes REGENERATE_IMPACTED_MODULES deterministically from dossier claims.
 * Does not write proposals or overwrite locked modules (T10 / G9).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = String(body.employeeId ?? '').trim();
    const vgrInstanceId = String(body.vgrInstanceId ?? '').trim();
    if (!employeeId || !vgrInstanceId) {
      return NextResponse.json({ error: 'employeeId en vgrInstanceId zijn verplicht' }, { status: 400 });
    }

    const access = await requireEmployeeAccess(employeeId);
    if (isAuthError(access)) return access;

    const { data: instance, error: instErr } = await (access.supabase as any)
      .from('vgr_instances')
      .select('id, employee_id, data_json')
      .eq('id', vgrInstanceId)
      .eq('employee_id', employeeId)
      .maybeSingle();
    if (instErr || !instance) {
      return NextResponse.json({ error: 'Rapportage niet gevonden' }, { status: 404 });
    }

    const draft: VGRData = ensureVGRShape(
      body.data && typeof body.data === 'object'
        ? (body.data as Record<string, unknown>)
        : ((instance.data_json ?? {}) as Record<string, unknown>),
    );

    const dossier = await loadVgrDossier(access.supabase, employeeId);
    const changedClaimIds = Array.isArray(body.changedClaimIds)
      ? body.changedClaimIds.map((x) => String(x)).filter(Boolean)
      : [];

    let changedClaims: Array<Pick<VgrAssertion, 'claim_id' | 'field_key'> & { source_ids?: string[] }> = [];
    if (changedClaimIds.length) {
      const set = new Set(changedClaimIds);
      changedClaims = (dossier?.assertions ?? [])
        .filter((a) => set.has(a.claim_id))
        .map((a) => ({
          claim_id: a.claim_id,
          field_key: a.field_key,
          source_ids: a.evidence.map((e) => e.source_id),
        }));
    } else {
      // Default: proposed / review_required assertions since last concept (all open proposals).
      changedClaims = (dossier?.assertions ?? [])
        .filter((a) => a.approval === 'proposed' || a.approval === 'review_required' || a.status === 'conflict')
        .map((a) => ({
          claim_id: a.claim_id,
          field_key: a.field_key,
          source_ids: a.evidence.map((e) => e.source_id),
        }));
    }

    const newDocTypes = (dossier?.source_documents ?? [])
      .filter((s) => !s.quarantined)
      .map((s) => ({ doc_type: s.doc_type, source_id: s.source_id }));

    const impact = computeImpactedModules({
      data: draft,
      changedClaims,
      changedClaimIds: changedClaims.map((c) => c.claim_id),
      // Only use doc types when we have claim signal; otherwise empty to avoid marking everything.
      newDocTypes: changedClaims.length ? [] : newDocTypes.slice(0, 8),
    });

    return NextResponse.json({
      ok: true,
      impact,
      regenerable: impact.hits.filter((h) => !h.manual_override_collision).map((h) => h.module_id),
      collisions: impact.hits.filter((h) => h.manual_override_collision).map((h) => h.module_id),
    });
  } catch (err) {
    console.error('❌ /api/vgr/impact-regen error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Impact-berekening mislukt', details: message }, { status: 500 });
  }
}
