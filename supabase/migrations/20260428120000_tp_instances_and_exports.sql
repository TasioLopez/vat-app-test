-- TP 2026 foundation: variant-aware TP drafts and immutable export snapshots

CREATE TABLE IF NOT EXISTS public.tp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('tp_legacy', 'tp_2026')),
  title TEXT NOT NULL DEFAULT 'Trajectplan',
  status TEXT NOT NULL DEFAULT 'draft',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tp_instances_employee_id
  ON public.tp_instances(employee_id);

CREATE INDEX IF NOT EXISTS idx_tp_instances_layout_status
  ON public.tp_instances(employee_id, layout_key, status);

CREATE INDEX IF NOT EXISTS idx_tp_instances_updated_at
  ON public.tp_instances(employee_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tp_instances_employee_layout_draft
  ON public.tp_instances(employee_id, layout_key)
  WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS public.tp_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tp_instance_id UUID NOT NULL REFERENCES public.tp_instances(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('tp_legacy', 'tp_2026')),
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT NULL,
  filename TEXT NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tp_exports_instance_id
  ON public.tp_exports(tp_instance_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tp_instances_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tp_instances_updated_at ON public.tp_instances;
CREATE TRIGGER tp_instances_updated_at
BEFORE UPDATE ON public.tp_instances
FOR EACH ROW EXECUTE FUNCTION public.tp_instances_set_updated_at();

-- Extend documents metadata so TP exports can be traced back to instance/snapshot
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS layout_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS tp_instance_id UUID NULL REFERENCES public.tp_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tp_export_id UUID NULL REFERENCES public.tp_exports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_tp_instance_id ON public.documents(tp_instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_tp_export_id ON public.documents(tp_export_id);
CREATE INDEX IF NOT EXISTS idx_documents_layout_key ON public.documents(layout_key);

-- RLS for tp_instances and tp_exports mirrors employee-level access model
ALTER TABLE public.tp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_instances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_instances_admin_all" ON public.tp_instances;
DROP POLICY IF EXISTS "tp_instances_select" ON public.tp_instances;
DROP POLICY IF EXISTS "tp_instances_insert" ON public.tp_instances;
DROP POLICY IF EXISTS "tp_instances_update" ON public.tp_instances;
DROP POLICY IF EXISTS "tp_instances_delete" ON public.tp_instances;

CREATE POLICY "tp_instances_admin_all"
ON public.tp_instances
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tp_instances_select"
ON public.tp_instances
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "tp_instances_insert"
ON public.tp_instances
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "tp_instances_update"
ON public.tp_instances
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

CREATE POLICY "tp_instances_delete"
ON public.tp_instances
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

ALTER TABLE public.tp_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_exports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_exports_admin_all" ON public.tp_exports;
DROP POLICY IF EXISTS "tp_exports_select" ON public.tp_exports;
DROP POLICY IF EXISTS "tp_exports_insert" ON public.tp_exports;
DROP POLICY IF EXISTS "tp_exports_update" ON public.tp_exports;
DROP POLICY IF EXISTS "tp_exports_delete" ON public.tp_exports;

CREATE POLICY "tp_exports_admin_all"
ON public.tp_exports
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tp_exports_select"
ON public.tp_exports
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.tp_instances ti
    WHERE ti.id = tp_exports.tp_instance_id
      AND public.user_has_employee_access(ti.employee_id)
  )
);

CREATE POLICY "tp_exports_insert"
ON public.tp_exports
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.tp_instances ti
    WHERE ti.id = tp_exports.tp_instance_id
      AND public.user_has_employee_access(ti.employee_id)
  )
);

CREATE POLICY "tp_exports_delete"
ON public.tp_exports
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.tp_instances ti
    WHERE ti.id = tp_exports.tp_instance_id
      AND public.user_has_employee_access(ti.employee_id)
  )
);
