import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import CVHubClient from '@/components/cv/CVHubClient';

export const metadata = {
  title: 'CV',
};

export default async function CVHubPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: emp, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .eq('id', employeeId)
    .maybeSingle();

  if (error || !emp) {
    notFound();
  }

  const label = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || 'Werknemer';

  return (
    <div>
      <CVHubClient employeeId={employeeId} employeeLabel={label} />
    </div>
  );
}
