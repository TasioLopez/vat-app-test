-- =============================================================================
-- Ensure users.role CHECK allows back_office.
-- Production may already have users_role_check limited to ('admin','user'),
-- so ADD IF NOT EXISTS in 20260901120000 would have been skipped.
-- =============================================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'user', 'back_office'));
