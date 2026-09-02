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
-- 2. Employees SELECT — back_office sees all
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

  -- Keep dossier access for the new owner (historical owner_id → employee_users sync).
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
