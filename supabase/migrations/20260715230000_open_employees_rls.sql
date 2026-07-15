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
