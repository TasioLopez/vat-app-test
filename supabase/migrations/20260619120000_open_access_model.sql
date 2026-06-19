-- =============================================================================
-- Open access model: all authenticated users can view/edit werkgevers & werknemers.
-- DELETE on employees, clients, referents remains admin-only.
-- Activity tracking moves to user_entity_activity (decoupled from assignments).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Activity tracking table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_entity_activity (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('employee', 'client')),
  entity_id UUID NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  last_modified_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_entity_activity_user_accessed
  ON public.user_entity_activity(user_id, last_accessed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_user_entity_activity_user_modified
  ON public.user_entity_activity(user_id, last_modified_at DESC NULLS LAST);

ALTER TABLE public.user_entity_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entity_activity FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_entity_activity_own_all" ON public.user_entity_activity;
CREATE POLICY "user_entity_activity_own_all"
ON public.user_entity_activity
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Backfill from legacy assignment/tracking tables
INSERT INTO public.user_entity_activity (user_id, entity_type, entity_id, last_accessed_at, last_modified_at)
SELECT user_id, 'employee', employee_id, last_accessed_at, last_modified_at
FROM public.employee_users
ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET
  last_accessed_at = GREATEST(
    public.user_entity_activity.last_accessed_at,
    EXCLUDED.last_accessed_at
  ),
  last_modified_at = GREATEST(
    public.user_entity_activity.last_modified_at,
    EXCLUDED.last_modified_at
  );

INSERT INTO public.user_entity_activity (user_id, entity_type, entity_id, last_accessed_at, last_modified_at)
SELECT user_id, 'client', client_id, last_accessed_at, last_modified_at
FROM public.user_clients
ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET
  last_accessed_at = GREATEST(
    public.user_entity_activity.last_accessed_at,
    EXCLUDED.last_accessed_at
  ),
  last_modified_at = GREATEST(
    public.user_entity_activity.last_modified_at,
    EXCLUDED.last_modified_at
  );

-- -----------------------------------------------------------------------------
-- 2. Helper functions: authenticated = has access (not assignment-based)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.user_has_employee_access(check_employee_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

-- -----------------------------------------------------------------------------
-- 3. Admin-only DELETE on top-level entities
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
DROP POLICY IF EXISTS "referents_delete" ON public.referents;

-- -----------------------------------------------------------------------------
-- 4. Clients RLS (was not in repo migrations previously)
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_admin_all" ON public.clients;
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_admin_all"
ON public.clients
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "clients_select"
ON public.clients
FOR SELECT
TO authenticated
USING (NOT public.is_admin());

CREATE POLICY "clients_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin());

CREATE POLICY "clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (NOT public.is_admin())
WITH CHECK (NOT public.is_admin());

-- No standard-user DELETE policy: only admins via clients_admin_all

-- -----------------------------------------------------------------------------
-- 5. CV photos storage: any authenticated user (helper already updated)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "cv_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_delete" ON storage.objects;

CREATE POLICY "cv_photos_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "cv_photos_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "cv_photos_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "cv_photos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  );
