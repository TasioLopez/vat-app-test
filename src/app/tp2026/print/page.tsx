import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import TP2026PrintableClient from '@/components/tp2026/TP2026PrintableClient';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';
import { applyTPProfileContext, resolveTPProfileContext } from '@/lib/tp/resolve-profile-context';
import { applyWorkerFacts, loadWorkerFacts } from '@/lib/employee/save-worker-facts';

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
    .select('id, employee_id, data_json, layout_key')
    .eq('id', tpInstanceId)
    .eq('layout_key', 'tp_2026')
    .single();

  if (error || !instance) notFound();

  const profileContext = await resolveTPProfileContext(supabase, instance.employee_id);
  const facts = await loadWorkerFacts(supabase, instance.employee_id);
  const withFacts = facts.snapshot
    ? applyWorkerFacts(
        ensureTP2026Shape((instance.data_json || {}) as Record<string, any>) as unknown as Record<string, unknown>,
        facts.snapshot.values
      )
    : ensureTP2026Shape((instance.data_json || {}) as Record<string, any>);
  const data = applyTPProfileContext(withFacts, profileContext) as Record<string, any>;

  return <TP2026PrintableClient data={data} />;
}
