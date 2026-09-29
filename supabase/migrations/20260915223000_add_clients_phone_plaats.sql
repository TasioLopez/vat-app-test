-- Employer (clients) contact fields used by the werkgever UI.
-- These existed in production outside the repo migration history but were
-- missing from staging bootstrap / generated types.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS plaats text;
