-- Back office: Gebruikers page access + assignment management; role-change guard.

-- -----------------------------------------------------------------------------
-- 1. users SELECT / UPDATE — admin or back_office
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_back_office());

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_back_office())
  WITH CHECK (public.is_admin() OR public.is_back_office());

-- -----------------------------------------------------------------------------
-- 2. Role change guard (UI can still be bypassed without this)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_users_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF public.is_back_office()
     AND NEW.id IS DISTINCT FROM auth.uid()
     AND OLD.role = 'user'
     AND NEW.role = 'back_office'
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Role change not permitted'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_users_role_change ON public.users;
CREATE TRIGGER trg_enforce_users_role_change
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_users_role_change();

-- -----------------------------------------------------------------------------
-- 3. user_clients / employee_users management for back_office
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_clients_admin_all" ON public.user_clients;
CREATE POLICY "user_clients_admin_all"
ON public.user_clients
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_back_office())
WITH CHECK (public.is_admin() OR public.is_back_office());

DROP POLICY IF EXISTS "employee_users_admin_all" ON public.employee_users;
CREATE POLICY "employee_users_admin_all"
ON public.employee_users
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_back_office())
WITH CHECK (public.is_admin() OR public.is_back_office());
