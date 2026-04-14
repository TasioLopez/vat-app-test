-- CV builder: documents and version history per werknemer
-- Migration: 20260414120000_cv_documents

CREATE TABLE IF NOT EXISTS public.cv_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'CV',
  template_key TEXT NOT NULL DEFAULT 'modern_professional',
  accent_color TEXT NOT NULL DEFAULT '#00A3CC',
  status TEXT NOT NULL DEFAULT 'draft',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_documents_employee_id ON public.cv_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_cv_documents_updated_at ON public.cv_documents(employee_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.cv_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  payload_json JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_versions_document ON public.cv_versions(cv_document_id, created_at DESC);

COMMENT ON TABLE public.cv_documents IS 'Saved CV instances per employee (inline-edited content in payload_json)';
COMMENT ON TABLE public.cv_versions IS 'Optional history snapshots when CV is saved';

CREATE OR REPLACE FUNCTION public.cv_documents_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cv_documents_updated_at ON public.cv_documents;
CREATE TRIGGER cv_documents_updated_at
BEFORE UPDATE ON public.cv_documents
FOR EACH ROW EXECUTE FUNCTION public.cv_documents_set_updated_at();

-- RLS (same access model as employee_details: admin OR user_has_employee_access)
ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cv_documents_admin_all" ON public.cv_documents;
DROP POLICY IF EXISTS "cv_documents_select" ON public.cv_documents;
DROP POLICY IF EXISTS "cv_documents_insert" ON public.cv_documents;
DROP POLICY IF EXISTS "cv_documents_update" ON public.cv_documents;
DROP POLICY IF EXISTS "cv_documents_delete" ON public.cv_documents;

CREATE POLICY "cv_documents_admin_all"
ON public.cv_documents
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "cv_documents_select"
ON public.cv_documents
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "cv_documents_insert"
ON public.cv_documents
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "cv_documents_update"
ON public.cv_documents
FOR UPDATE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
)
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "cv_documents_delete"
ON public.cv_documents
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

ALTER TABLE public.cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_versions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cv_versions_admin_all" ON public.cv_versions;
DROP POLICY IF EXISTS "cv_versions_select" ON public.cv_versions;
DROP POLICY IF EXISTS "cv_versions_insert" ON public.cv_versions;
DROP POLICY IF EXISTS "cv_versions_update" ON public.cv_versions;
DROP POLICY IF EXISTS "cv_versions_delete" ON public.cv_versions;

CREATE POLICY "cv_versions_admin_all"
ON public.cv_versions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "cv_versions_select"
ON public.cv_versions
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.cv_documents d
      WHERE d.id = cv_versions.cv_document_id
      AND public.user_has_employee_access(d.employee_id)
    )
);

CREATE POLICY "cv_versions_insert"
ON public.cv_versions
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.cv_documents d
      WHERE d.id = cv_versions.cv_document_id
      AND public.user_has_employee_access(d.employee_id)
    )
);

CREATE POLICY "cv_versions_delete"
ON public.cv_versions
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.cv_documents d
      WHERE d.id = cv_versions.cv_document_id
      AND public.user_has_employee_access(d.employee_id)
    )
);
