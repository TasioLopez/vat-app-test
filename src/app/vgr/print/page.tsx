import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import VGRPrintableClient from '@/components/vgr/VGRPrintableClient';

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
    .select('id, data_json, layout_key')
    .eq('id', vgrInstanceId)
    .eq('layout_key', 'vgr')
    .single();

  if (error || !instance) notFound();

  return <VGRPrintableClient data={(instance.data_json || {}) as Record<string, any>} />;
}
