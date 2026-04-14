import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import CVPrintableClient from '@/components/cv/CVPrintableClient';
import type { CvTemplateKey } from '@/types/cv';
import { DEFAULT_ACCENT_COLOR } from '@/types/cv';
import { normalizeCvPayload } from '@/lib/cv/normalize';

/** Print-only route for CV PDF export (RLS: user must have access to CV row). */
export default async function Page(props: {
  searchParams: Promise<{ employeeId?: string; cvId?: string; pdf?: string; u?: string }>;
}) {
  const searchParams = await props.searchParams;
  const employeeId = searchParams.employeeId;
  const cvId = searchParams.cvId;

  if (!employeeId || !cvId) {
    notFound();
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: doc, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('id', cvId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error || !doc) {
    notFound();
  }

  const payload = normalizeCvPayload(doc.payload_json);

  return (
    <CVPrintableClient
      employeeId={employeeId}
      cvId={cvId}
      title={doc.title}
      templateKey={(doc.template_key as CvTemplateKey) || 'modern_professional'}
      accentColor={doc.accent_color || DEFAULT_ACCENT_COLOR}
      payload={payload}
    />
  );
}
