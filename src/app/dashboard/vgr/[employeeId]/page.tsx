import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { mergeVgrInitialData } from '@/lib/vgr/migrate-from-tp';
import { vgrBijlagenAreEmpty } from '@/lib/vgr/mapping';

type Params = { employeeId: string };

export const dynamic = 'force-dynamic';

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

  if (!vgrInstanceId) {
    const [employeeRes, detailsRes, tpRes] = await Promise.all([
      supabase.from('employees').select('first_name, last_name').eq('id', employeeId).maybeSingle(),
      supabase.from('employee_details').select('date_of_birth').eq('employee_id', employeeId).maybeSingle(),
      (supabase as any)
        .from('tp_instances')
        .select('data_json')
        .eq('employee_id', employeeId)
        .eq('layout_key', 'tp_2026')
        .eq('status', 'draft')
        .maybeSingle(),
    ]);

    const initialData = mergeVgrInitialData(
      {},
      (tpRes.data?.data_json || null) as Record<string, unknown> | null,
      (employeeRes.data || null) as Record<string, unknown> | null,
      (detailsRes.data || null) as Record<string, unknown> | null
    );

    const { data: inserted, error: insertError } = await (supabase as any)
      .from('vgr_instances')
      .insert({
        employee_id: employeeId,
        layout_key: 'vgr',
        title: 'VGR',
        status: 'draft',
        data_json: initialData,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      throw new Error('Could not create VGR draft');
    }
    vgrInstanceId = inserted.id;
  } else if (vgrBijlagenAreEmpty((existing?.data_json || {}) as Record<string, unknown>)) {
    const [employeeRes, detailsRes, tpRes] = await Promise.all([
      supabase.from('employees').select('first_name, last_name').eq('id', employeeId).maybeSingle(),
      supabase.from('employee_details').select('date_of_birth').eq('employee_id', employeeId).maybeSingle(),
      (supabase as any)
        .from('tp_instances')
        .select('data_json')
        .eq('employee_id', employeeId)
        .eq('layout_key', 'tp_2026')
        .eq('status', 'draft')
        .maybeSingle(),
    ]);

    const merged = mergeVgrInitialData(
      (existing?.data_json || {}) as Record<string, unknown>,
      (tpRes.data?.data_json || null) as Record<string, unknown> | null,
      (employeeRes.data || null) as Record<string, unknown> | null,
      (detailsRes.data || null) as Record<string, unknown> | null
    );

    await (supabase as any)
      .from('vgr_instances')
      .update({
        data_json: merged,
        updated_by: user?.id ?? null,
      })
      .eq('id', vgrInstanceId);
  }

  redirect(`/dashboard/vgr/${employeeId}/${vgrInstanceId}`);
}
