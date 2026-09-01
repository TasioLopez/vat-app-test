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
