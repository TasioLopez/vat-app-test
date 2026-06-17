-- =============================================================================
-- Employee details field validation metadata
-- Enables explicit review/validated lifecycle for AI-filled employee details.
-- =============================================================================

ALTER TABLE public.employee_details
  ADD COLUMN IF NOT EXISTS field_review_status jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.employee_details
  ADD COLUMN IF NOT EXISTS field_content_hash jsonb NOT NULL DEFAULT '{}'::jsonb;

