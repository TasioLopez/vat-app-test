-- =============================================================================
-- MULTI-REFERENT: drop legacy referent columns from clients (run after code uses referents only)
-- =============================================================================

ALTER TABLE public.clients DROP COLUMN IF EXISTS referent_first_name;
ALTER TABLE public.clients DROP COLUMN IF EXISTS referent_last_name;
ALTER TABLE public.clients DROP COLUMN IF EXISTS referent_phone;
ALTER TABLE public.clients DROP COLUMN IF EXISTS referent_email;
ALTER TABLE public.clients DROP COLUMN IF EXISTS referent_function;
ALTER TABLE public.clients DROP COLUMN IF EXISTS referent_gender;
