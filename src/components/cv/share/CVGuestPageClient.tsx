'use client';

import { CVProvider } from '@/context/CVContext';
import { UnsavedChangesGuardProvider } from '@/context/UnsavedChangesGuardContext';
import CVGuestSyncGuard from '@/components/cv/share/CVGuestSyncGuard';
import CVGuestEditorShell from '@/components/cv/share/CVGuestEditorShell';
import { normalizeCvPayload } from '@/lib/cv/normalize';
import { coerceCvTemplateKey, DEFAULT_ACCENT_COLOR } from '@/types/cv';
import type { CvDocumentPayload } from '@/types/cv';

type GuestDocument = {
  id: string;
  employee_id: string;
  title: string;
  template_key: string;
  accent_color: string;
  payload_json: CvDocumentPayload;
  updated_at: string;
};

export default function CVGuestPageClient({
  shareToken,
  employeeLabel,
  document: doc,
  initialPhotoSignedUrl,
}: {
  shareToken: string;
  employeeLabel: string;
  document: GuestDocument;
  initialPhotoSignedUrl?: string | null;
}) {
  const payload = normalizeCvPayload(
    doc.payload_json,
    coerceCvTemplateKey(doc.template_key)
  );

  return (
    <UnsavedChangesGuardProvider>
      <CVProvider
        employeeId={doc.employee_id}
        cvId={doc.id}
        initialTitle={doc.title}
        initialTemplateKey={coerceCvTemplateKey(doc.template_key)}
        initialAccentColor={doc.accent_color || DEFAULT_ACCENT_COLOR}
        initialPayload={payload}
        initialUpdatedAt={doc.updated_at}
        initialPhotoSignedUrl={initialPhotoSignedUrl}
        editorMode="guest"
        shareToken={shareToken}
      >
        <CVGuestSyncGuard />
        <CVGuestEditorShell shareToken={shareToken} employeeLabel={employeeLabel} />
      </CVProvider>
    </UnsavedChangesGuardProvider>
  );
}
