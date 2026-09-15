-- =============================================================================
-- STAGING ONLY — paste in Supabase SQL Editor (vat-app-staging)
-- =============================================================================
-- Fixes: "Could not find the 'phone' column of 'clients' in the schema cache"
-- Also adds plaats (city) used by werkgever create/edit UI.
-- Safe to re-run.
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS plaats text;

-- Optional: refresh PostgREST schema cache if the error persists after ALTER
-- (Supabase Dashboard → Settings → API → Reload schema, or:)
NOTIFY pgrst, 'reload schema';
