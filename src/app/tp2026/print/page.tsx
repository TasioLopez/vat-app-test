import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import TP2026PrintableClient from '@/components/tp2026/TP2026PrintableClient';

export const dynamic = 'force-dynamic';

type SearchParams = { tpInstanceId?: string };

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const tpInstanceId = searchParams.tpInstanceId;
  if (!tpInstanceId) notFound();

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: instance, error } = await (supabase as any)
    .from('tp_instances')
    .select('id, data_json, layout_key')
    .eq('id', tpInstanceId)
    .eq('layout_key', 'tp_2026')
    .single();

  if (error || !instance) notFound();

  return <TP2026PrintableClient data={(instance.data_json || {}) as Record<string, any>} />;
}
