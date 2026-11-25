-- VGR multi-document sources (staging): allow more than one dossier file per type
-- (AD versions, transcripts, CV, …) and store extracted document_date separately
-- from uploaded_at. Apply on staging only until Phase 2+ promote.

DROP INDEX IF EXISTS public.documents_employee_type_unique;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_date date NULL;

COMMENT ON COLUMN public.documents.document_date IS
  'Document date extracted from the file (YYYY-MM-DD) when known; never confused with uploaded_at.';

CREATE INDEX IF NOT EXISTS idx_documents_employee_uploaded_at
  ON public.documents (employee_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_employee_document_date
  ON public.documents (employee_id, document_date DESC NULLS LAST);
