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
-- 2. Clients RLS — replace open non-admin model
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
-- 3. Referents RLS — back office manages referents on any werkgever
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
