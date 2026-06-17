import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { validateGuestAccess } from '@/lib/cv-share/access';
import { CV_SHARE_SESSION_COOKIE } from '@/lib/cv-share/session';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import CVPrintableClient from '@/components/cv/CVPrintableClient';
import type { CvLocale } from '@/types/cv';
import { coerceCvTemplateKey, DEFAULT_ACCENT_COLOR } from '@/types/cv';
import { normalizeCvPayload } from '@/lib/cv/normalize';
import { getActiveCvModel } from '@/lib/cv/normalize';

/** Print-only route for guest CV PDF export (share session required). */
export default async function Page(props: {
  searchParams: Promise<{ token?: string; pdf?: string; locale?: string }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;
  const printLocale: CvLocale = searchParams.locale === 'en' ? 'en' : 'nl';

  if (!token) {
    notFound();
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CV_SHARE_SESSION_COOKIE)?.value;
  const access = await validateGuestAccess(token, sessionToken);

  if (!access) {
    notFound();
  }

  const { share } = access;

  const { data: doc, error } = await supabaseAdmin
    .from('cv_documents')
    .select('*')
    .eq('id', share.cv_document_id)
    .eq('employee_id', share.employee_id)
    .maybeSingle();

  if (error || !doc) {
    notFound();
  }

  const payload = normalizeCvPayload(doc.payload_json, coerceCvTemplateKey(doc.template_key));
  const activeModel = getActiveCvModel(
    printLocale === 'en' && payload.content.en
      ? { ...payload, activeLocale: 'en' as const }
      : payload
  );

  let initialPhotoSignedUrl: string | null = null;
  const photoPath = activeModel.personal.photoStoragePath?.trim();
  if (photoPath && activeModel.options?.includePhotoInCv) {
    const { data, error: signErr } = await supabaseAdmin.storage
      .from('cv-photos')
      .createSignedUrl(photoPath, 3600);
    if (!signErr && data?.signedUrl) {
      initialPhotoSignedUrl = data.signedUrl;
    }
  }

  return (
    <CVPrintableClient
      employeeId={share.employee_id}
      cvId={share.cv_document_id}
      title={doc.title}
      templateKey={coerceCvTemplateKey(doc.template_key)}
      accentColor={doc.accent_color || DEFAULT_ACCENT_COLOR}
      payload={payload}
      initialPhotoSignedUrl={initialPhotoSignedUrl}
      printLocale={printLocale}
    />
  );
}
