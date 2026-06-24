-- VGR foundation: draft instances and immutable export snapshots

CREATE TABLE IF NOT EXISTS public.vgr_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('vgr')),
  title TEXT NOT NULL DEFAULT 'VGR',
  status TEXT NOT NULL DEFAULT 'draft',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_employee_id
  ON public.vgr_instances(employee_id);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_layout_status
  ON public.vgr_instances(employee_id, layout_key, status);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_updated_at
  ON public.vgr_instances(employee_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vgr_instances_employee_layout_draft
  ON public.vgr_instances(employee_id, layout_key)
  WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS public.vgr_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vgr_instance_id UUID NOT NULL REFERENCES public.vgr_instances(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('vgr')),
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT NULL,
  filename TEXT NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vgr_exports_instance_id
  ON public.vgr_exports(vgr_instance_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.vgr_instances_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vgr_instances_updated_at ON public.vgr_instances;
CREATE TRIGGER vgr_instances_updated_at
BEFORE UPDATE ON public.vgr_instances
FOR EACH ROW EXECUTE FUNCTION public.vgr_instances_set_updated_at();

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS vgr_instance_id UUID NULL REFERENCES public.vgr_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vgr_export_id UUID NULL REFERENCES public.vgr_exports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_vgr_instance_id ON public.documents(vgr_instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_vgr_export_id ON public.documents(vgr_export_id);

ALTER TABLE public.vgr_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vgr_instances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vgr_instances_admin_all" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_select" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_insert" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_update" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_delete" ON public.vgr_instances;

CREATE POLICY "vgr_instances_admin_all"
ON public.vgr_instances
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "vgr_instances_select"
ON public.vgr_instances
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_instances_insert"
ON public.vgr_instances
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_instances_update"
ON public.vgr_instances
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

CREATE POLICY "vgr_instances_delete"
ON public.vgr_instances
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

ALTER TABLE public.vgr_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vgr_exports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vgr_exports_admin_all" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_select" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_insert" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_update" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_delete" ON public.vgr_exports;

CREATE POLICY "vgr_exports_admin_all"
ON public.vgr_exports
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "vgr_exports_select"
ON public.vgr_exports
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);

CREATE POLICY "vgr_exports_insert"
ON public.vgr_exports
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);

CREATE POLICY "vgr_exports_delete"
ON public.vgr_exports
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);
