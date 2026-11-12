-- Review metadata for shared case facts (sick day, trajectory dates, doctor, AD report).
-- Same lifecycle as employee_details.field_review_status: autofill cannot replace a validated value.

ALTER TABLE public.tp_meta
  ADD COLUMN IF NOT EXISTS field_review_status jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.tp_meta
  ADD COLUMN IF NOT EXISTS field_content_hash jsonb NOT NULL DEFAULT '{}'::jsonb;
