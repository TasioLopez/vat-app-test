-- CV share links for werknemer review (token-based guest access)
-- Migration: 20260617120000_cv_share_links

CREATE TABLE IF NOT EXISTS public.cv_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  recipient_email TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  last_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_share_links_token_hash ON public.cv_share_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_cv_share_links_cv_document ON public.cv_share_links(cv_document_id);
CREATE INDEX IF NOT EXISTS idx_cv_share_links_employee ON public.cv_share_links(employee_id);

-- One active share per CV document
CREATE UNIQUE INDEX IF NOT EXISTS idx_cv_share_links_one_active_per_cv
ON public.cv_share_links(cv_document_id)
WHERE revoked_at IS NULL;

COMMENT ON TABLE public.cv_share_links IS 'Token-based share links for werknemer CV review without app account';

ALTER TABLE public.cv_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_share_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cv_share_links_admin_all" ON public.cv_share_links;
DROP POLICY IF EXISTS "cv_share_links_advisor_select" ON public.cv_share_links;
DROP POLICY IF EXISTS "cv_share_links_advisor_insert" ON public.cv_share_links;
DROP POLICY IF EXISTS "cv_share_links_advisor_update" ON public.cv_share_links;

CREATE POLICY "cv_share_links_admin_all"
ON public.cv_share_links
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "cv_share_links_advisor_select"
ON public.cv_share_links
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "cv_share_links_advisor_insert"
ON public.cv_share_links
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
    AND created_by = auth.uid()
);

CREATE POLICY "cv_share_links_advisor_update"
ON public.cv_share_links
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
