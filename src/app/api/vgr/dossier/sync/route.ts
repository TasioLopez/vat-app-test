import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { serviceRoleSupabase } from '@/lib/supabase/service-role';
import { syncVgrDossierFromDocuments } from '@/lib/vgr/dossier/sync-from-documents';
import { openDossierIssues } from '@/lib/vgr/dossier/merge';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/vgr/dossier/sync
 * Body: { employeeId, documentIds?: string[], textByDocumentId?: Record<string,string> }
 *
 * CLASSIFY → EXTRACT → MERGE into vgr_dossiers. Does not write VGR report text (D01).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = String(body.employeeId ?? '').trim();
    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is verplicht' }, { status: 400 });
    }

    const access = await requireEmployeeAccess(employeeId);
    if (isAuthError(access)) return access;

    const filterIds = Array.isArray(body.documentIds)
      ? new Set(body.documentIds.map((x) => String(x)))
      : null;
    const textByDocumentId =
      body.textByDocumentId && typeof body.textByDocumentId === 'object'
        ? (body.textByDocumentId as Record<string, string>)
        : {};

    const { data: docs, error } = await (access.supabase as any)
      .from('documents')
      .select('id, type, name, uploaded_at')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'Documenten laden mislukt', details: error.message }, { status: 500 });
    }

    const rows = ((docs ?? []) as { id: string; type: string; name: string; uploaded_at?: string | null }[]).filter(
      (d) => !filterIds || filterIds.has(d.id),
    );

    const dossier = await syncVgrDossierFromDocuments({
      supabase: serviceRoleSupabase,
      employeeId,
      documents: rows,
      textByDocumentId,
    });

    return NextResponse.json({
      ok: true,
      dossier,
      open_issues: openDossierIssues(dossier),
      counts: {
        sources: dossier.source_documents.length,
        assertions: dossier.assertions.length,
        activities: dossier.activities.length,
        issues: dossier.issues.length,
      },
    });
  } catch (err) {
    console.error('❌ /api/vgr/dossier/sync error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Dossier sync mislukt', details: message }, { status: 500 });
  }
}
