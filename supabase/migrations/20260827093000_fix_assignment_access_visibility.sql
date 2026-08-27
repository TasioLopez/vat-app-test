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
INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
SELECT a.user_id, a.entity_id, COALESCE(a.last_modified_at, a.last_accessed_at, now())
FROM public.user_entity_activity a
WHERE a.entity_type = 'employee'
  AND a.entity_id IS NOT NULL
  AND a.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.user_id = a.user_id
      AND eu.employee_id = a.entity_id
  );
