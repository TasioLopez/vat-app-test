import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { buildVgrInitialData, vgrDraftIsEmpty } from '@/lib/vgr/migrate-from-tp';
import { vgrMetaToColumns } from '@/lib/vgr/persist-draft';

type Params = { employeeId: string };

export const dynamic = 'force-dynamic';

/**
 * Entry point: open (or create) the single VGR draft for this employee.
 * A new draft is hydrated from the latest TP 2026 instance, the employee master
 * records and — for follow-up reports — the most recent final VGR.
 */
export default async function VGREntryPage({ params }: { params: Promise<Params> }) {
  const { employeeId } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await (supabase as any)
    .from('vgr_instances')
    .select('id, data_json')
    .eq('employee_id', employeeId)
    .eq('layout_key', 'vgr')
    .eq('status', 'draft')
    .maybeSingle();

  let vgrInstanceId = existing?.id as string | undefined;
  const existingData = (existing?.data_json || {}) as Record<string, unknown>;
  const needsHydration = !vgrInstanceId || vgrDraftIsEmpty(existingData);

  if (needsHydration) {
    const [employeeRes, detailsRes, metaRes, tpRes, priorRes] = await Promise.all([
      (supabase as any)
        .from('employees')
        .select('first_name, last_name, email')
        .eq('id', employeeId)
        .maybeSingle(),
      supabase.from('employee_details').select('*').eq('employee_id', employeeId).maybeSingle(),
      supabase.from('tp_meta').select('*').eq('employee_id', employeeId).maybeSingle(),
      (supabase as any)
        .from('tp_instances')
        .select('id, data_json, status, updated_at')
        .eq('employee_id', employeeId)
        .eq('layout_key', 'tp_2026')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from('vgr_instances')
        .select('id, data_json, updated_at')
        .eq('employee_id', employeeId)
        .eq('layout_key', 'vgr')
        .eq('status', 'final')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let priorExportId: string | null = null;
    let priorSnapshot: Record<string, unknown> | null = null;
    if (priorRes.data?.id) {
      const { data: exp } = await (supabase as any)
        .from('vgr_exports')
        .select('id, snapshot_json')
        .eq('vgr_instance_id', priorRes.data.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      priorExportId = exp?.id ?? null;
      priorSnapshot = (exp?.snapshot_json || priorRes.data.data_json || null) as Record<string, unknown> | null;
    }

    const initialData = buildVgrInitialData(existingData, {
      tpData: (tpRes.data?.data_json || null) as Record<string, unknown> | null,
      tpInstanceId: tpRes.data?.id ?? null,
      employee: (employeeRes.data || null) as Record<string, unknown> | null,
      details: (detailsRes.data || null) as Record<string, unknown> | null,
      tpMeta: (metaRes.data || null) as Record<string, unknown> | null,
      priorReport: priorSnapshot,
      priorInstanceId: priorRes.data?.id ?? null,
      priorExportId,
    });

    if (!vgrInstanceId) {
      const { data: inserted, error: insertError } = await (supabase as any)
        .from('vgr_instances')
        .insert({
          employee_id: employeeId,
          layout_key: 'vgr',
          title: 'VGR',
          status: 'draft',
          data_json: initialData,
          ...vgrMetaToColumns(initialData),
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select('id')
        .single();

      if (insertError || !inserted?.id) {
        throw new Error('Could not create VGR draft');
      }
      vgrInstanceId = inserted.id;
    } else {
      await (supabase as any)
        .from('vgr_instances')
        .update({
          data_json: initialData,
          ...vgrMetaToColumns(initialData),
          updated_by: user?.id ?? null,
        })
        .eq('id', vgrInstanceId);
    }
  }

  redirect(`/dashboard/vgr/${employeeId}/${vgrInstanceId}`);
}
