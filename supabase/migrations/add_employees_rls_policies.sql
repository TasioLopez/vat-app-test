-- =============================================================================
-- RLS POLICIES FOR EMPLOYEES AND RELATED TABLES
-- Migration: add_employees_rls_policies.sql
-- =============================================================================
--
-- REQUIREMENTS:
-- 1. Admins have FULL access (SELECT, INSERT, UPDATE, DELETE) to ALL employees
-- 2. Standard users can:
--    - SELECT employees belonging to their assigned clients OR directly assigned to them
--    - INSERT employees only for clients they're assigned to
--    - UPDATE employees they have access to
--    - DELETE employees they have access to
--
-- =============================================================================

-- =============================================================================
-- SECTION 1: HELPER FUNCTION FOR CHECKING ADMIN ROLE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();

    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =============================================================================
-- SECTION 2: HELPER FUNCTION FOR CHECKING CLIENT ACCESS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_clients
        WHERE user_id = auth.uid()
        AND client_id = check_client_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.user_has_client_access(UUID) TO authenticated;

-- =============================================================================
-- SECTION 3: HELPER FUNCTION FOR CHECKING EMPLOYEE ACCESS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_has_employee_access(check_employee_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        -- Access via client assignment
        SELECT 1 FROM public.employees e
        JOIN public.user_clients uc ON uc.client_id = e.client_id
        WHERE e.id = check_employee_id
        AND uc.user_id = auth.uid()
    ) OR EXISTS (
        -- Direct employee assignment
        SELECT 1 FROM public.employee_users eu
        WHERE eu.employee_id = check_employee_id
        AND eu.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.user_has_employee_access(UUID) TO authenticated;

-- =============================================================================
-- SECTION 4: EMPLOYEES TABLE POLICIES
-- =============================================================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;

-- Drop existing policies (both old and new names)
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
-- Drop old policies from Supabase dashboard
DROP POLICY IF EXISTS "Admins can delete all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can select all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update all employees" ON public.employees;
DROP POLICY IF EXISTS "Users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Users can read assigned employees" ON public.employees;

-- ADMIN: Full access to all employees
CREATE POLICY "employees_admin_all"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- STANDARD USERS: SELECT employees they have access to
CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND (
        EXISTS (
            SELECT 1 FROM public.user_clients uc
            WHERE uc.user_id = auth.uid()
            AND uc.client_id = employees.client_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.employee_users eu
            WHERE eu.user_id = auth.uid()
            AND eu.employee_id = employees.id
        )
    )
);

-- STANDARD USERS: INSERT employees only for clients they're assigned to
CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND (
        client_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.user_clients uc
            WHERE uc.user_id = auth.uid()
            AND uc.client_id = employees.client_id
        )
    )
);

-- STANDARD USERS: UPDATE employees they have access to
CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
    NOT public.is_admin()
    AND (
        EXISTS (
            SELECT 1 FROM public.user_clients uc
            WHERE uc.user_id = auth.uid()
            AND uc.client_id = employees.client_id
        )
        OR EXISTS (
            SELECT 1 FROM public.employee_users eu
            WHERE eu.user_id = auth.uid()
            AND eu.employee_id = employees.id
        )
    )
)
WITH CHECK (
    NOT public.is_admin()
    AND (
        client_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.user_clients uc
            WHERE uc.user_id = auth.uid()
            AND uc.client_id = employees.client_id
        )
    )
);

-- STANDARD USERS: DELETE employees they have access to
CREATE POLICY "employees_delete"
ON public.employees
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND (
        EXISTS (
            SELECT 1 FROM public.user_clients uc
            WHERE uc.user_id = auth.uid()
            AND uc.client_id = employees.client_id
        )
        OR EXISTS (
            SELECT 1 FROM public.employee_users eu
            WHERE eu.user_id = auth.uid()
            AND eu.employee_id = employees.id
        )
    )
);

-- =============================================================================
-- SECTION 5: EMPLOYEE_DETAILS TABLE POLICIES
-- =============================================================================

ALTER TABLE public.employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_details FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_details_admin_all" ON public.employee_details;
DROP POLICY IF EXISTS "employee_details_select" ON public.employee_details;
DROP POLICY IF EXISTS "employee_details_insert" ON public.employee_details;
DROP POLICY IF EXISTS "employee_details_update" ON public.employee_details;
DROP POLICY IF EXISTS "employee_details_delete" ON public.employee_details;
-- Drop old policies from Supabase dashboard
DROP POLICY IF EXISTS "Admins can manage all employee_details" ON public.employee_details;
DROP POLICY IF EXISTS "Users can insert employee_details" ON public.employee_details;
DROP POLICY IF EXISTS "Users can read assigned employee_details" ON public.employee_details;

-- ADMIN: Full access to all employee details
CREATE POLICY "employee_details_admin_all"
ON public.employee_details
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- STANDARD USERS: SELECT details for employees they have access to
CREATE POLICY "employee_details_select"
ON public.employee_details
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

-- STANDARD USERS: INSERT details for employees they have access to
CREATE POLICY "employee_details_insert"
ON public.employee_details
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

-- STANDARD USERS: UPDATE details for employees they have access to
CREATE POLICY "employee_details_update"
ON public.employee_details
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

-- STANDARD USERS: DELETE details for employees they have access to
CREATE POLICY "employee_details_delete"
ON public.employee_details
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

-- =============================================================================
-- SECTION 6: EMPLOYEE_USERS TABLE POLICIES
-- =============================================================================

ALTER TABLE public.employee_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_users_admin_all" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_select" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_insert" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_update" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_delete" ON public.employee_users;
-- Drop old policies from Supabase dashboard
DROP POLICY IF EXISTS "Admins can manage all employee_users" ON public.employee_users;
DROP POLICY IF EXISTS "Users can insert employee_users" ON public.employee_users;
DROP POLICY IF EXISTS "Users can read own assignments" ON public.employee_users;

-- ADMIN: Full access to all employee_users assignments
CREATE POLICY "employee_users_admin_all"
ON public.employee_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- STANDARD USERS: SELECT their own assignments OR assignments for employees they have client access to
CREATE POLICY "employee_users_select"
ON public.employee_users
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.employees e
            JOIN public.user_clients uc ON uc.client_id = e.client_id
            WHERE e.id = employee_users.employee_id
            AND uc.user_id = auth.uid()
        )
    )
);

-- STANDARD USERS: INSERT their own assignments for employees they have client access to
CREATE POLICY "employee_users_insert"
ON public.employee_users
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.employees e
        JOIN public.user_clients uc ON uc.client_id = e.client_id
        WHERE e.id = employee_users.employee_id
        AND uc.user_id = auth.uid()
    )
);

-- STANDARD USERS: UPDATE their own assignments
CREATE POLICY "employee_users_update"
ON public.employee_users
FOR UPDATE
TO authenticated
USING (
    NOT public.is_admin()
    AND user_id = auth.uid()
)
WITH CHECK (
    NOT public.is_admin()
    AND user_id = auth.uid()
);

-- STANDARD USERS: DELETE their own assignments or for employees they have access to
CREATE POLICY "employee_users_delete"
ON public.employee_users
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.employees e
            JOIN public.user_clients uc ON uc.client_id = e.client_id
            WHERE e.id = employee_users.employee_id
            AND uc.user_id = auth.uid()
        )
    )
);

-- =============================================================================
-- SECTION 7: PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_user_clients_user_id ON public.user_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_client_id ON public.user_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_user_client ON public.user_clients(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_employee_users_user_id ON public.employee_users(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_users_employee_id ON public.employee_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_users_user_employee ON public.employee_users(user_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_client_id ON public.employees(client_id);
CREATE INDEX IF NOT EXISTS idx_employee_details_employee_id ON public.employee_details(employee_id);
