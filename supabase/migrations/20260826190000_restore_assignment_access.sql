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
-- 6. documents / tp_meta / tp_docs — employee-scoped
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
