-- =============================================================================
-- RESUME after last_accessed_at error on Block 2
-- Run this if PASTE_2 failed at open_access backfill (earlier feature SQL already applied).
-- Adds missing columns, then continues from open_access through final RLS.
-- =============================================================================

-- >>> BEGIN supabase/migrations/add_access_tracking_to_existing_tables.sql
-- Add last_accessed_at and last_modified_at to employee_users
ALTER TABLE employee_users 
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_employee_users_last_accessed 
ON employee_users(user_id, last_accessed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_employee_users_last_modified 
ON employee_users(user_id, last_modified_at DESC NULLS LAST);

-- Add similar columns to user_clients if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_clients') THEN
    ALTER TABLE user_clients 
    ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;
    
    CREATE INDEX IF NOT EXISTS idx_user_clients_last_accessed 
    ON user_clients(user_id, last_accessed_at DESC NULLS LAST);
    
    CREATE INDEX IF NOT EXISTS idx_user_clients_last_modified 
    ON user_clients(user_id, last_modified_at DESC NULLS LAST);
  END IF;
END $$;


-- >>> END supabase/migrations/add_access_tracking_to_existing_tables.sql

-- >>> BEGIN supabase/migrations/20260619120000_open_access_model.sql
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

-- >>> END supabase/migrations/20260619120000_open_access_model.sql

-- >>> BEGIN supabase/migrations/20260624120000_vgr_instances_and_exports.sql
-- VGR foundation: draft instances and immutable export snapshots

CREATE TABLE IF NOT EXISTS public.vgr_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('vgr')),
  title TEXT NOT NULL DEFAULT 'VGR',
  status TEXT NOT NULL DEFAULT 'draft',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_employee_id
  ON public.vgr_instances(employee_id);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_layout_status
  ON public.vgr_instances(employee_id, layout_key, status);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_updated_at
  ON public.vgr_instances(employee_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vgr_instances_employee_layout_draft
  ON public.vgr_instances(employee_id, layout_key)
  WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS public.vgr_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vgr_instance_id UUID NOT NULL REFERENCES public.vgr_instances(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('vgr')),
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT NULL,
  filename TEXT NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vgr_exports_instance_id
  ON public.vgr_exports(vgr_instance_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.vgr_instances_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vgr_instances_updated_at ON public.vgr_instances;
CREATE TRIGGER vgr_instances_updated_at
BEFORE UPDATE ON public.vgr_instances
FOR EACH ROW EXECUTE FUNCTION public.vgr_instances_set_updated_at();

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS vgr_instance_id UUID NULL REFERENCES public.vgr_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vgr_export_id UUID NULL REFERENCES public.vgr_exports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_vgr_instance_id ON public.documents(vgr_instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_vgr_export_id ON public.documents(vgr_export_id);

ALTER TABLE public.vgr_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vgr_instances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vgr_instances_admin_all" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_select" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_insert" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_update" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_delete" ON public.vgr_instances;

CREATE POLICY "vgr_instances_admin_all"
ON public.vgr_instances
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "vgr_instances_select"
ON public.vgr_instances
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_instances_insert"
ON public.vgr_instances
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_instances_update"
ON public.vgr_instances
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

CREATE POLICY "vgr_instances_delete"
ON public.vgr_instances
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

ALTER TABLE public.vgr_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vgr_exports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vgr_exports_admin_all" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_select" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_insert" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_update" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_delete" ON public.vgr_exports;

CREATE POLICY "vgr_exports_admin_all"
ON public.vgr_exports
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "vgr_exports_select"
ON public.vgr_exports
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);

CREATE POLICY "vgr_exports_insert"
ON public.vgr_exports
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);

CREATE POLICY "vgr_exports_delete"
ON public.vgr_exports
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);

-- >>> END supabase/migrations/20260624120000_vgr_instances_and_exports.sql

-- >>> BEGIN supabase/migrations/20260706120000_security_rls_users_documents_storage.sql
-- Security RLS: users, documents, storage.objects (documents bucket), tp_meta, tp_docs, user_clients
-- Open-access model preserved: authenticated advisors may access all employee/client data.

-- -----------------------------------------------------------------------------
-- public.users
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_service" ON public.users;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No authenticated self-insert/update; signup uses service role API routes.

-- -----------------------------------------------------------------------------
-- public.documents
-- -----------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_authenticated_all" ON public.documents;

CREATE POLICY "documents_authenticated_all"
  ON public.documents FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- storage.objects â€” documents bucket
-- Open-access: any authenticated advisor may access employee document paths.
-- Mijn Stem uploads live under {auth.uid()}/ and are scoped to the owning user.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_storage_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_mijn_stem_own" ON storage.objects;

CREATE POLICY "documents_storage_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid() IS NOT NULL
      AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    )
  );

CREATE POLICY "documents_storage_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  );

CREATE POLICY "documents_storage_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  );

CREATE POLICY "documents_storage_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  );

-- -----------------------------------------------------------------------------
-- public.tp_meta
-- -----------------------------------------------------------------------------
ALTER TABLE public.tp_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_meta FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_meta_authenticated_all" ON public.tp_meta;

CREATE POLICY "tp_meta_authenticated_all"
  ON public.tp_meta FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- public.tp_docs
-- -----------------------------------------------------------------------------
ALTER TABLE public.tp_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_docs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_docs_authenticated_all" ON public.tp_docs;

CREATE POLICY "tp_docs_authenticated_all"
  ON public.tp_docs FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- public.user_clients
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clients FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_clients_authenticated_all" ON public.user_clients;

CREATE POLICY "user_clients_authenticated_all"
  ON public.user_clients FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- mijn_stem_documents â€” explicit TO authenticated on existing policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.mijn_stem_documents;

CREATE POLICY "Users can manage their own documents"
  ON public.mijn_stem_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- >>> END supabase/migrations/20260706120000_security_rls_users_documents_storage.sql

-- >>> BEGIN supabase/migrations/20260706120100_api_rate_limits.sql
-- API rate limiting table (service role only; no client access)

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  rate_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits FORCE ROW LEVEL SECURITY;

-- No policies: authenticated/anon cannot access; service role bypasses RLS.

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.api_rate_limits%ROWTYPE;
  v_elapsed numeric;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.api_rate_limits WHERE rate_key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.api_rate_limits (rate_key, window_start, request_count)
    VALUES (p_key, v_now, 1);
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  v_elapsed := EXTRACT(EPOCH FROM (v_now - v_row.window_start));

  IF v_elapsed >= p_window_seconds THEN
    UPDATE public.api_rate_limits
    SET window_start = v_now, request_count = 1
    WHERE rate_key = p_key;
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_row.request_count >= p_max_requests THEN
    allowed := false;
    retry_after_seconds := GREATEST(1, ceil(p_window_seconds - v_elapsed)::integer);
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.api_rate_limits
  SET request_count = request_count + 1
  WHERE rate_key = p_key;

  allowed := true;
  retry_after_seconds := 0;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON TABLE public.api_rate_limits FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.check_api_rate_limit(text, integer, integer) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(text, integer, integer) TO service_role;

-- >>> END supabase/migrations/20260706120100_api_rate_limits.sql

-- >>> BEGIN supabase/migrations/20260715230000_open_employees_rls.sql
-- Open employees RLS to match clients open-access model.
-- Standard users can SELECT/INSERT/UPDATE all employees.
-- DELETE remains admin-only (employees_delete was already dropped in 20260619120000).

DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
-- Keep delete admin-only; ensure no standard-user delete policy exists
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (NOT public.is_admin());

CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin());

CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (NOT public.is_admin())
WITH CHECK (NOT public.is_admin());

-- Admins continue via employees_admin_all (FOR ALL).
-- No employees_delete for standard users: only admins can delete.

-- >>> END supabase/migrations/20260715230000_open_employees_rls.sql

-- >>> BEGIN supabase/migrations/20260723120000_employee_owner_and_org_users.sql
-- Soft case ownership on employees + safe org user directory for non-admins.

-- -----------------------------------------------------------------------------
-- 1. employees.owner_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS owner_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_owner_id
  ON public.employees(owner_id);

-- Backfill: prefer user with latest last_modified_at, else latest last_accessed_at
WITH ranked AS (
  SELECT
    entity_id AS employee_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY entity_id
      ORDER BY
        last_modified_at DESC NULLS LAST,
        last_accessed_at DESC NULLS LAST
    ) AS rn
  FROM public.user_entity_activity
  WHERE entity_type = 'employee'
    AND entity_id IS NOT NULL
    AND user_id IS NOT NULL
)
UPDATE public.employees e
SET owner_id = ranked.user_id
FROM ranked
WHERE e.id = ranked.employee_id
  AND ranked.rn = 1
  AND e.owner_id IS NULL;

-- -----------------------------------------------------------------------------
-- 2. list_org_users â€” directory without signup tokens (bypasses users RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_org_users()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.role,
    u.status
  FROM public.users u
  WHERE u.status IS NULL
     OR u.status IN ('confirmed', 'invited', 'active')
  ORDER BY
    lower(coalesce(u.last_name, '')),
    lower(coalesce(u.first_name, '')),
    lower(u.email);
$$;

REVOKE ALL ON FUNCTION public.list_org_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_org_users() TO authenticated;

-- >>> END supabase/migrations/20260723120000_employee_owner_and_org_users.sql

-- >>> BEGIN supabase/migrations/20260802240000_cv_documents_parent_cv_id.sql
-- Link shared CV copies to their source document
-- Migration: 20260802240000_cv_documents_parent_cv_id

ALTER TABLE public.cv_documents
  ADD COLUMN IF NOT EXISTS parent_cv_id UUID NULL
  REFERENCES public.cv_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cv_documents_parent
  ON public.cv_documents(parent_cv_id);

COMMENT ON COLUMN public.cv_documents.parent_cv_id IS
  'When set, this row is a shared/review copy of the parent CV; guest edits target this row only.';

-- >>> END supabase/migrations/20260802240000_cv_documents_parent_cv_id.sql

-- >>> BEGIN supabase/migrations/20260826190000_restore_assignment_access.sql
-- =============================================================================
-- Restore assignment-based werknemer access.
-- Users see employees they own (owner_id) or that an admin assigned (employee_users).
-- Assigning a werkgever (user_clients) alone does NOT grant all employees of that client.
-- DELETE on employees remains admin-only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_employee_access(check_employee_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF check_employee_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.employee_id = check_employee_id
      AND eu.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = check_employee_id
      AND e.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.user_has_employee_access(UUID) TO authenticated;

-- Client access: explicit user_clients assignment OR any accessible employee under that client.
CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF check_client_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_clients uc
    WHERE uc.user_id = auth.uid()
      AND uc.client_id = check_client_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.client_id = check_client_id
      AND e.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.employee_users eu ON eu.employee_id = e.id
    WHERE e.client_id = check_client_id
      AND eu.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.user_has_client_access(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Backfill assignments from owner_id (so existing creators keep access)
-- -----------------------------------------------------------------------------
INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
SELECT e.owner_id, e.id, COALESCE(e.created_at, now())
FROM public.employees e
WHERE e.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.user_id = e.owner_id
      AND eu.employee_id = e.id
  );

-- -----------------------------------------------------------------------------
-- 3. Employees RLS (assignment-scoped; delete admin-only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.user_has_employee_access(id)
);

-- Allow create for any authenticated user (creator is auto-assigned in app + owner_id).
CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR public.user_has_employee_access(id)
)
WITH CHECK (
  public.is_admin()
  OR public.user_has_employee_access(id)
);

-- Ensure admin catch-all exists (admins must see all employees).
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
CREATE POLICY "employees_admin_all"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- No standard-user DELETE policy (admins via employees_admin_all).

-- -----------------------------------------------------------------------------
-- 4. employee_users: allow creator self-assign via owner_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employee_users_select" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_insert" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_update" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_delete" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_admin_all" ON public.employee_users;

CREATE POLICY "employee_users_admin_all"
ON public.employee_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "employee_users_select"
ON public.employee_users
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = employee_users.employee_id
      AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "employee_users_insert"
ON public.employee_users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_users.employee_id
        AND e.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "employee_users_update"
ON public.employee_users
FOR UPDATE
TO authenticated
USING (public.is_admin() OR user_id = auth.uid())
WITH CHECK (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "employee_users_delete"
ON public.employee_users
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = employee_users.employee_id
      AND e.owner_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 5. user_clients: own rows + admin (no open authenticated_all)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_clients_authenticated_all" ON public.user_clients;
DROP POLICY IF EXISTS "user_clients_select_own" ON public.user_clients;
DROP POLICY IF EXISTS "user_clients_insert_own" ON public.user_clients;
DROP POLICY IF EXISTS "user_clients_delete_own" ON public.user_clients;
DROP POLICY IF EXISTS "user_clients_admin_all" ON public.user_clients;

CREATE POLICY "user_clients_admin_all"
ON public.user_clients
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "user_clients_select_own"
ON public.user_clients
FOR SELECT
TO authenticated
USING (NOT public.is_admin() AND user_id = auth.uid());

CREATE POLICY "user_clients_insert_own"
ON public.user_clients
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin() AND user_id = auth.uid());

CREATE POLICY "user_clients_delete_own"
ON public.user_clients
FOR DELETE
TO authenticated
USING (NOT public.is_admin() AND user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. documents / tp_meta / tp_docs â€” employee-scoped
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_authenticated_all" ON public.documents;
DROP POLICY IF EXISTS "documents_admin_all" ON public.documents;
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;

CREATE POLICY "documents_admin_all"
ON public.documents
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "documents_select"
ON public.documents
FOR SELECT
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "documents_insert"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "documents_update"
ON public.documents
FOR UPDATE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id))
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "documents_delete"
ON public.documents
FOR DELETE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

DROP POLICY IF EXISTS "tp_meta_authenticated_all" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_admin_all" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_select" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_insert" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_update" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_delete" ON public.tp_meta;

CREATE POLICY "tp_meta_admin_all"
ON public.tp_meta
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tp_meta_select"
ON public.tp_meta
FOR SELECT
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_meta_insert"
ON public.tp_meta
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_meta_update"
ON public.tp_meta
FOR UPDATE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id))
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_meta_delete"
ON public.tp_meta
FOR DELETE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

DROP POLICY IF EXISTS "tp_docs_authenticated_all" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_admin_all" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_select" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_insert" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_update" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_delete" ON public.tp_docs;

CREATE POLICY "tp_docs_admin_all"
ON public.tp_docs
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tp_docs_select"
ON public.tp_docs
FOR SELECT
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_docs_insert"
ON public.tp_docs
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_docs_update"
ON public.tp_docs
FOR UPDATE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id))
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_docs_delete"
ON public.tp_docs
FOR DELETE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

-- -----------------------------------------------------------------------------
-- 7. Storage: documents + cv-photos require employee access for employee folders
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_storage_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_delete" ON storage.objects;

CREATE POLICY "documents_storage_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

CREATE POLICY "documents_storage_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

CREATE POLICY "documents_storage_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

CREATE POLICY "documents_storage_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

DROP POLICY IF EXISTS "cv_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_delete" ON storage.objects;

CREATE POLICY "cv_photos_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  )
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

-- Referents delete stays admin-only; select/insert/update already use user_has_client_access.

-- >>> END supabase/migrations/20260826190000_restore_assignment_access.sql

-- >>> BEGIN supabase/migrations/20260827093000_fix_assignment_access_visibility.sql
-- =============================================================================
-- Fix assignment access: ensure admins see all employees, and backfill ownership
-- from activity / assignments so creators regain access.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Recreate admin catch-all + simplify SELECT/UPDATE policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
CREATE POLICY "employees_admin_all"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.user_has_employee_access(id)
);

DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR public.user_has_employee_access(id)
)
WITH CHECK (
  public.is_admin()
  OR public.user_has_employee_access(id)
);

-- Keep delete admin-only (no non-admin delete policy).

-- Ensure employee_users admin policy exists (UsersTable assignment UI).
DROP POLICY IF EXISTS "employee_users_admin_all" ON public.employee_users;
CREATE POLICY "employee_users_admin_all"
ON public.employee_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employee_users_select" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_insert" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_update" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_delete" ON public.employee_users;

CREATE POLICY "employee_users_select"
ON public.employee_users
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = employee_users.employee_id
      AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "employee_users_insert"
ON public.employee_users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_users.employee_id
        AND e.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "employee_users_update"
ON public.employee_users
FOR UPDATE
TO authenticated
USING (public.is_admin() OR user_id = auth.uid())
WITH CHECK (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "employee_users_delete"
ON public.employee_users
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = employee_users.employee_id
      AND e.owner_id = auth.uid()
  )
);

-- employee_details admin catch-all (in case missing)
DROP POLICY IF EXISTS "employee_details_admin_all" ON public.employee_details;
CREATE POLICY "employee_details_admin_all"
ON public.employee_details
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Broader owner_id backfill from user_entity_activity
-- -----------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    entity_id AS employee_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY entity_id
      ORDER BY
        last_modified_at DESC NULLS LAST,
        last_accessed_at DESC NULLS LAST
    ) AS rn
  FROM public.user_entity_activity
  WHERE entity_type = 'employee'
    AND entity_id IS NOT NULL
    AND user_id IS NOT NULL
)
UPDATE public.employees e
SET owner_id = ranked.user_id
FROM ranked
WHERE e.id = ranked.employee_id
  AND ranked.rn = 1
  AND e.owner_id IS NULL;

-- If still null, prefer any existing employee_users assignee as owner.
WITH ranked_assign AS (
  SELECT
    employee_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id
      ORDER BY assigned_at ASC NULLS LAST
    ) AS rn
  FROM public.employee_users
  WHERE user_id IS NOT NULL
    AND employee_id IS NOT NULL
)
UPDATE public.employees e
SET owner_id = ranked_assign.user_id
FROM ranked_assign
WHERE e.id = ranked_assign.employee_id
  AND ranked_assign.rn = 1
  AND e.owner_id IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Sync employee_users from owner_id (creators keep access)
-- -----------------------------------------------------------------------------
INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
SELECT e.owner_id, e.id, COALESCE(e.created_at, now())
FROM public.employees e
WHERE e.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.user_id = e.owner_id
      AND eu.employee_id = e.id
  );

-- Also ensure every activity participant has an assignment row (multi-user dossiers).
-- Skip orphaned activity rows whose employee (or user) no longer exists.
INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
SELECT a.user_id, a.entity_id, COALESCE(a.last_modified_at, a.last_accessed_at, now())
FROM public.user_entity_activity a
JOIN public.employees e ON e.id = a.entity_id
JOIN public.users u ON u.id = a.user_id
WHERE a.entity_type = 'employee'
  AND a.entity_id IS NOT NULL
  AND a.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.user_id = a.user_id
      AND eu.employee_id = a.entity_id
  );

-- >>> END supabase/migrations/20260827093000_fix_assignment_access_visibility.sql

-- >>> BEGIN supabase/migrations/20260827094500_fix_employees_rls_recursion.sql
-- =============================================================================
-- Break RLS infinite recursion between employees <-> employee_users.
-- Error 42P17: infinite recursion detected in policy for relation "employees"
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helpers that NEVER re-enter RLS (SECURITY DEFINER + row_security off)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_assigned_to_employee(check_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.employee_id = check_employee_id
      AND eu.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_employee(check_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = check_employee_id
      AND e.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_employee_access(check_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    check_employee_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.employee_users eu
        WHERE eu.employee_id = check_employee_id
          AND eu.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.id = check_employee_id
          AND e.owner_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    check_client_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_clients uc
        WHERE uc.user_id = auth.uid()
          AND uc.client_id = check_client_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.client_id = check_client_id
          AND e.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.employee_users eu
        JOIN public.employees e ON e.id = eu.employee_id
        WHERE e.client_id = check_client_id
          AND eu.user_id = auth.uid()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_assigned_to_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_employee_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_client_access(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. employees policies: use row columns + assignment helper (no cross-policy subquery)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_admin_all"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- owner_id checked on the row itself (no subquery into employees).
-- assignment checked via SECURITY DEFINER helper (bypasses employee_users RLS).
CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.user_is_assigned_to_employee(id)
);

CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.user_is_assigned_to_employee(id)
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.user_is_assigned_to_employee(id)
);

-- Delete remains admin-only via employees_admin_all.

-- -----------------------------------------------------------------------------
-- 3. employee_users policies: NEVER subquery employees directly
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employee_users_admin_all" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_select" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_insert" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_update" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_delete" ON public.employee_users;

CREATE POLICY "employee_users_admin_all"
ON public.employee_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "employee_users_select"
ON public.employee_users
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_owns_employee(employee_id)
);

CREATE POLICY "employee_users_insert"
ON public.employee_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.user_owns_employee(employee_id)
);

CREATE POLICY "employee_users_update"
ON public.employee_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "employee_users_delete"
ON public.employee_users
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_owns_employee(employee_id)
);

-- >>> END supabase/migrations/20260827094500_fix_employees_rls_recursion.sql

-- >>> BEGIN supabase/migrations/20260901120000_add_back_office_role.sql
-- =============================================================================
-- Back office role: werkgever catalog management (create/delete any, see all)
-- while werknemer access stays assignment-scoped like standard users.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_back_office()
RETURNS BOOLEAN AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();

    RETURN user_role = 'back_office';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.is_back_office() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_clients()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_admin() OR public.is_back_office();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.can_manage_clients() TO authenticated;

-- Optional role constraint (skip if invalid rows exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_role_check'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_role_check
            CHECK (role IN ('admin', 'user', 'back_office'));
    END IF;
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'users_role_check not added: existing rows have invalid role values';
END $$;

-- -----------------------------------------------------------------------------
-- 2. Clients RLS â€” replace open non-admin model
-- -----------------------------------------------------------------------------
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
USING (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
);

CREATE POLICY "clients_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_clients());

CREATE POLICY "clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
)
WITH CHECK (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
);

CREATE POLICY "clients_delete"
ON public.clients
FOR DELETE
TO authenticated
USING (public.can_manage_clients());

-- -----------------------------------------------------------------------------
-- 3. Referents RLS â€” back office manages referents on any werkgever
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "referents_select" ON public.referents;
DROP POLICY IF EXISTS "referents_insert" ON public.referents;
DROP POLICY IF EXISTS "referents_update" ON public.referents;
DROP POLICY IF EXISTS "referents_delete" ON public.referents;

CREATE POLICY "referents_select"
ON public.referents
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
);

CREATE POLICY "referents_insert"
ON public.referents
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
);

CREATE POLICY "referents_update"
ON public.referents
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
)
WITH CHECK (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
);

CREATE POLICY "referents_delete"
ON public.referents
FOR DELETE
TO authenticated
USING (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
);

-- >>> END supabase/migrations/20260901120000_add_back_office_role.sql

-- >>> BEGIN supabase/migrations/20260902140000_rework_back_office_permissions.sql
-- =============================================================================
-- Rework back_office: all clients visible to users; BO cannot delete clients;
-- BO sees all employees; owner changes via set_employee_owner RPC only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Clients RLS
-- -----------------------------------------------------------------------------
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

-- All authenticated users can list werkgevers (needed when creating werknemers).
CREATE POLICY "clients_select"
ON public.clients
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "clients_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_clients());

CREATE POLICY "clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
)
WITH CHECK (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
);

-- Delete: admin only (back_office cannot delete).
CREATE POLICY "clients_delete"
ON public.clients
FOR DELETE
TO authenticated
USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Employees SELECT â€” back_office sees all
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_select" ON public.employees;

CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.is_back_office()
  OR owner_id = auth.uid()
  OR public.user_is_assigned_to_employee(id)
);

-- -----------------------------------------------------------------------------
-- 3. Secure owner change RPC (admin + back_office only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_employee_owner(
  p_employee_id uuid,
  p_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_back_office()) THEN
    RAISE EXCEPTION 'not authorized to set employee owner';
  END IF;

  IF p_employee_id IS NULL THEN
    RAISE EXCEPTION 'employee id required';
  END IF;

  IF p_owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = p_owner_id
  ) THEN
    RAISE EXCEPTION 'owner user not found';
  END IF;

  UPDATE public.employees
  SET owner_id = p_owner_id
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee not found';
  END IF;

  -- Keep dossier access for the new owner (historical owner_id â†’ employee_users sync).
  IF p_owner_id IS NOT NULL THEN
    INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
    SELECT p_owner_id, p_employee_id, now()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.employee_users eu
      WHERE eu.user_id = p_owner_id
        AND eu.employee_id = p_employee_id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_employee_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_employee_owner(uuid, uuid) TO authenticated;

-- >>> END supabase/migrations/20260902140000_rework_back_office_permissions.sql

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    missing := array_append(missing, 'bucket:documents');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'cv-photos') THEN
    missing := array_append(missing, 'bucket:cv-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'kb-media') THEN
    missing := array_append(missing, 'bucket:kb-media');
  END IF;
  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Staging bootstrap incomplete: %', array_to_string(missing, ', ');
  END IF;
  RAISE NOTICE 'Staging bootstrap verification OK';
END;
$$;

