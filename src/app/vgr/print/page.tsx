import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import VGRPrintableClient from '@/components/vgr/VGRPrintableClient';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { applyTPProfileContext, resolveTPProfileContext } from '@/lib/tp/resolve-profile-context';

export const dynamic = 'force-dynamic';

type SearchParams = { vgrInstanceId?: string };

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const vgrInstanceId = searchParams.vgrInstanceId;
  if (!vgrInstanceId) notFound();

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: instance, error } = await (supabase as any)
    .from('vgr_instances')
    .select('id, employee_id, data_json, layout_key')
    .eq('id', vgrInstanceId)
    .eq('layout_key', 'vgr')
    .single();

  if (error || !instance) notFound();

  const profileContext = await resolveTPProfileContext(supabase, instance.employee_id);
  const data = applyTPProfileContext(
    ensureVGRShape((instance.data_json || {}) as Record<string, any>),
    profileContext
  ) as Record<string, any>;

  return <VGRPrintableClient data={data} />;
}
