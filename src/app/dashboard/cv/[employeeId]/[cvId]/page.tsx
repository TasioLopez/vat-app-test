import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import CVEditorPageClient from '@/components/cv/CVEditorPageClient';

export const metadata = {
  title: 'CV bewerken',
};

export default async function CVEditorPage({
  params,
}: {
  params: Promise<{ employeeId: string; cvId: string }>;
}) {
  const { employeeId, cvId } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: row, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('id', cvId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('first_name, last_name')
    .eq('id', employeeId)
    .maybeSingle();

  const employeeLabel = [emp?.first_name, emp?.last_name].filter(Boolean).join(' ') || 'Werknemer';

  return <CVEditorPageClient employeeId={employeeId} employeeLabel={employeeLabel} initialRow={row} />;
}
