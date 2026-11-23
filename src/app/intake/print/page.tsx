import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import IntakePrintableClient from '@/components/intake/IntakePrintableClient';
import { INTAKE_LAYOUT_KEY } from '@/lib/intake/schema';
import { overlayIntakeWithWorkerFacts } from '@/lib/intake/worker-overlay';
import { loadWorkerFacts } from '@/lib/employee/save-worker-facts';

export const dynamic = 'force-dynamic';

type SearchParams = { intakeInstanceId?: string };

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const intakeInstanceId = searchParams.intakeInstanceId;
  if (!intakeInstanceId) notFound();

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: instance, error } = await (supabase as any)
    .from('intake_instances')
    .select('id, employee_id, data_json, layout_key')
    .eq('id', intakeInstanceId)
    .eq('layout_key', INTAKE_LAYOUT_KEY)
    .single();

  if (error || !instance) notFound();

  const facts = await loadWorkerFacts(supabase, instance.employee_id);
  const data = facts.snapshot
    ? overlayIntakeWithWorkerFacts(instance.data_json || {}, facts.snapshot.values)
    : instance.data_json || {};

  return <IntakePrintableClient data={data} />;
}
