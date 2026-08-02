-- Link shared CV copies to their source document
-- Migration: 20260802240000_cv_documents_parent_cv_id

ALTER TABLE public.cv_documents
  ADD COLUMN IF NOT EXISTS parent_cv_id UUID NULL
  REFERENCES public.cv_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cv_documents_parent
  ON public.cv_documents(parent_cv_id);

COMMENT ON COLUMN public.cv_documents.parent_cv_id IS
  'When set, this row is a shared/review copy of the parent CV; guest edits target this row only.';
