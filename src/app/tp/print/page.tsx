// src/app/tp/print/page.tsx
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadTPData } from '@/lib/tp/load';
import TPPrintableClient from '@/components/tp/TPPrintableClient';

export const dynamic = 'force-dynamic';

type SearchParams = { employeeId?: string };

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const employeeId = searchParams.employeeId;

  if (!employeeId) notFound();

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .maybeSingle();

  if (!employee) notFound();

  const data = await loadTPData(employeeId, {
    preferredConsultantUserId: user.id,
    supabase,
  });

  return <TPPrintableClient employeeId={employeeId} data={data} />;
}
