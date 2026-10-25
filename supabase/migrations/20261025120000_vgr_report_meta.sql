-- VGR report metadata (additive; data_json stays the source of truth, these columns
-- are denormalized for listing / follow-up report lookup).

ALTER TABLE public.vgr_instances
  ADD COLUMN IF NOT EXISTS period_start DATE NULL,
  ADD COLUMN IF NOT EXISTS period_end DATE NULL,
  ADD COLUMN IF NOT EXISTS report_date DATE NULL,
  ADD COLUMN IF NOT EXISTS linked_tp_instance_id UUID NULL REFERENCES public.tp_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prior_vgr_instance_id UUID NULL REFERENCES public.vgr_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prior_vgr_export_id UUID NULL REFERENCES public.vgr_exports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 2;

-- status: draft | review | final (kept as TEXT; enforced by app + check)
ALTER TABLE public.vgr_instances DROP CONSTRAINT IF EXISTS vgr_instances_status_check;
ALTER TABLE public.vgr_instances
  ADD CONSTRAINT vgr_instances_status_check CHECK (status IN ('draft', 'review', 'final'));

CREATE INDEX IF NOT EXISTS idx_vgr_instances_employee_report_date
  ON public.vgr_instances(employee_id, report_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_prior
  ON public.vgr_instances(prior_vgr_instance_id);

ALTER TABLE public.vgr_exports
  ADD COLUMN IF NOT EXISTS period_start DATE NULL,
  ADD COLUMN IF NOT EXISTS period_end DATE NULL,
  ADD COLUMN IF NOT EXISTS report_date DATE NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER NULL;

-- Allow advisers to update exports (needed to attach storage_path after upload)
DROP POLICY IF EXISTS "vgr_exports_update" ON public.vgr_exports;
CREATE POLICY "vgr_exports_update"
ON public.vgr_exports
FOR UPDATE
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
)
WITH CHECK (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);
