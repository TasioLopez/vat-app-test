'use client';

import { CVProvider } from '@/context/CVContext';
import CVSyncGuard from '@/components/cv/CVSyncGuard';
import CVEditorShell from '@/components/cv/CVEditorShell';
import { normalizeCvPayload } from '@/lib/cv/normalize';
import type { CvTemplateKey } from '@/types/cv';
import { DEFAULT_ACCENT_COLOR } from '@/types/cv';
import type { Database } from '@/types/supabase';

type CvRow = Database['public']['Tables']['cv_documents']['Row'];

export default function CVEditorPageClient({
  employeeId,
  employeeLabel,
  initialRow,
}: {
  employeeId: string;
  employeeLabel: string;
  initialRow: CvRow;
}) {
  const payload = normalizeCvPayload(initialRow.payload_json);

  return (
    <CVProvider
      employeeId={employeeId}
      cvId={initialRow.id}
      initialTitle={initialRow.title}
      initialTemplateKey={(initialRow.template_key as CvTemplateKey) || 'modern_professional'}
      initialAccentColor={initialRow.accent_color || DEFAULT_ACCENT_COLOR}
      initialPayload={payload}
      initialUpdatedAt={initialRow.updated_at}
    >
      <CVSyncGuard />
      <CVEditorShell employeeId={employeeId} employeeLabel={employeeLabel} />
    </CVProvider>
  );
}
