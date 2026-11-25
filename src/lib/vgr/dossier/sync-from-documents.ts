import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyDocument } from './classify';
import { extractAssertionsFromSource } from './extract';
import { mergeDossierUpdate } from './merge';
import { loadVgrDossier, saveVgrDossier } from './store';
import type { VgrDossier } from './types';

export type EmployeeDocumentRow = {
  id: string;
  type: string;
  name: string;
  uploaded_at?: string | null;
  document_date?: string | null;
};

/**
 * Classify + extract + merge all (or selected) employee documents into the dossier.
 * Text extract is optional; without OCR text only coarse activity stubs are added.
 */
export async function syncVgrDossierFromDocuments(params: {
  supabase: SupabaseClient;
  employeeId: string;
  documents: EmployeeDocumentRow[];
  /** Optional map documentId → extracted plain text. */
  textByDocumentId?: Record<string, string>;
}): Promise<VgrDossier> {
  const { supabase, employeeId, documents, textByDocumentId = {} } = params;
  let dossier = await loadVgrDossier(supabase, employeeId);

  for (const doc of documents) {
    if (!doc.id) continue;
    if (doc.type === 'vgr' || doc.type === 'tp' || String(doc.type).startsWith('tp_')) continue;

    const source = classifyDocument({
      employeeId,
      documentId: doc.id,
      appType: doc.type,
      filename: doc.name || doc.id,
      uploadedAt: doc.uploaded_at,
      documentDate: doc.document_date ?? null,
    });
    const extracted = extractAssertionsFromSource({
      source,
      text: textByDocumentId[doc.id],
    });
    dossier = mergeDossierUpdate({
      dossier,
      sources: [source],
      assertions: extracted.assertions,
      activities: extracted.activities,
    });
  }

  await saveVgrDossier(supabase, dossier);
  return dossier;
}
