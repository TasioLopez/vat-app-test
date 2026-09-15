import { notFound } from 'next/navigation';
import { isStagingEnv } from '@/lib/auth/staging-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import IntakePrintableClient from '@/components/intake/IntakePrintableClient';
import { INTAKE_LAYOUT_KEY } from '@/lib/intake/schema';

export const dynamic = 'force-dynamic';

type SearchParams = { intakeInstanceId?: string };

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isStagingEnv()) notFound();

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
    .select('id, data_json, layout_key')
    .eq('id', intakeInstanceId)
    .eq('layout_key', INTAKE_LAYOUT_KEY)
    .single();

  if (error || !instance) notFound();

  return <IntakePrintableClient data={instance.data_json || {}} />;
}
