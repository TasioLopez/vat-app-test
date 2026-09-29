-- =============================================================================
-- STAGING ONLY — paste once in Supabase SQL Editor (vat-app-staging)
-- =============================================================================
-- Complete pending SQL (nothing else required for these features):
--   1) 20260910213000_add_fml_izp_lab_kind.sql
--   2) 20260915190000_fix_users_role_check_back_office.sql
--   3) 20260915220000_intake_instances_and_exports.sql
--   4) 20260915223000_add_clients_phone_plaats.sql
--
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS where needed).
-- Do NOT run on production until explicitly approved.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) tp_meta.fml_izp_lab_kind
-- ---------------------------------------------------------------------------

ALTER TABLE public.tp_meta
  ADD COLUMN IF NOT EXISTS fml_izp_lab_kind text;

-- ---------------------------------------------------------------------------
-- 1b) clients.phone + clients.plaats (werkgever UI)
-- ---------------------------------------------------------------------------

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS plaats text;

-- ---------------------------------------------------------------------------
-- 2) Ensure users.role CHECK allows back_office
-- ---------------------------------------------------------------------------

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'user', 'back_office'));

-- ---------------------------------------------------------------------------
-- 3) First-class Intake drafts and immutable PDF export snapshots
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.intake_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('intake_v1')),
  title TEXT NOT NULL DEFAULT 'Intakeformulier',
  status TEXT NOT NULL DEFAULT 'draft',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_document_id UUID NULL REFERENCES public.documents(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ NULL,
  validated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_instances_employee_id
  ON public.intake_instances(employee_id);

CREATE INDEX IF NOT EXISTS idx_intake_instances_layout_status
  ON public.intake_instances(employee_id, layout_key, status);

CREATE INDEX IF NOT EXISTS idx_intake_instances_updated_at
  ON public.intake_instances(employee_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_intake_instances_employee_layout_draft
  ON public.intake_instances(employee_id, layout_key)
  WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS public.intake_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_instance_id UUID NOT NULL REFERENCES public.intake_instances(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('intake_v1')),
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT NULL,
  filename TEXT NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_exports_instance_id
  ON public.intake_exports(intake_instance_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.intake_instances_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS intake_instances_updated_at ON public.intake_instances;
CREATE TRIGGER intake_instances_updated_at
BEFORE UPDATE ON public.intake_instances
FOR EACH ROW EXECUTE FUNCTION public.intake_instances_set_updated_at();

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS intake_instance_id UUID NULL REFERENCES public.intake_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intake_export_id UUID NULL REFERENCES public.intake_exports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_intake_instance_id ON public.documents(intake_instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_intake_export_id ON public.documents(intake_export_id);

-- Allow multiple generated intake PDFs per employee (same pattern as TP exports).
DROP INDEX IF EXISTS public.documents_employee_type_unique;
CREATE UNIQUE INDEX documents_employee_type_unique
ON public.documents(employee_id, type)
WHERE type IS DISTINCT FROM 'tp'
  AND type IS DISTINCT FROM 'intake'
  AND type IS DISTINCT FROM 'vgr';

ALTER TABLE public.intake_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_instances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intake_instances_admin_all" ON public.intake_instances;
DROP POLICY IF EXISTS "intake_instances_select" ON public.intake_instances;
DROP POLICY IF EXISTS "intake_instances_insert" ON public.intake_instances;
DROP POLICY IF EXISTS "intake_instances_update" ON public.intake_instances;
DROP POLICY IF EXISTS "intake_instances_delete" ON public.intake_instances;

CREATE POLICY "intake_instances_admin_all"
ON public.intake_instances
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "intake_instances_select"
ON public.intake_instances
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "intake_instances_insert"
ON public.intake_instances
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "intake_instances_update"
ON public.intake_instances
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

CREATE POLICY "intake_instances_delete"
ON public.intake_instances
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

ALTER TABLE public.intake_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_exports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intake_exports_admin_all" ON public.intake_exports;
DROP POLICY IF EXISTS "intake_exports_select" ON public.intake_exports;
DROP POLICY IF EXISTS "intake_exports_insert" ON public.intake_exports;
DROP POLICY IF EXISTS "intake_exports_update" ON public.intake_exports;
DROP POLICY IF EXISTS "intake_exports_delete" ON public.intake_exports;

CREATE POLICY "intake_exports_admin_all"
ON public.intake_exports
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "intake_exports_select"
ON public.intake_exports
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.intake_instances ii
    WHERE ii.id = intake_exports.intake_instance_id
      AND public.user_has_employee_access(ii.employee_id)
  )
);

CREATE POLICY "intake_exports_insert"
ON public.intake_exports
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.intake_instances ii
    WHERE ii.id = intake_exports.intake_instance_id
      AND public.user_has_employee_access(ii.employee_id)
  )
);

CREATE POLICY "intake_exports_delete"
ON public.intake_exports
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.intake_instances ii
    WHERE ii.id = intake_exports.intake_instance_id
      AND public.user_has_employee_access(ii.employee_id)
  )
);
