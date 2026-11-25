-- VGR Phase 2: pack-shaped dossier spine (assertions / activities / source_documents)
-- beside vgr_instances. Report JSON remains the render/export projection.

CREATE TABLE IF NOT EXISTS public.vgr_dossiers (
  employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vgr_dossiers_updated_at
  ON public.vgr_dossiers(updated_at DESC);

CREATE OR REPLACE FUNCTION public.vgr_dossiers_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vgr_dossiers_updated_at ON public.vgr_dossiers;
CREATE TRIGGER vgr_dossiers_updated_at
BEFORE UPDATE ON public.vgr_dossiers
FOR EACH ROW EXECUTE FUNCTION public.vgr_dossiers_set_updated_at();

ALTER TABLE public.vgr_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vgr_dossiers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vgr_dossiers_admin_all" ON public.vgr_dossiers;
DROP POLICY IF EXISTS "vgr_dossiers_select" ON public.vgr_dossiers;
DROP POLICY IF EXISTS "vgr_dossiers_insert" ON public.vgr_dossiers;
DROP POLICY IF EXISTS "vgr_dossiers_update" ON public.vgr_dossiers;
DROP POLICY IF EXISTS "vgr_dossiers_delete" ON public.vgr_dossiers;

CREATE POLICY "vgr_dossiers_admin_all"
ON public.vgr_dossiers
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "vgr_dossiers_select"
ON public.vgr_dossiers
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_dossiers_insert"
ON public.vgr_dossiers
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_dossiers_update"
ON public.vgr_dossiers
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

CREATE POLICY "vgr_dossiers_delete"
ON public.vgr_dossiers
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);
