-- =============================================================================
-- Narrow back_office: like a normal user in the app, except:
--   - see all werkgevers / werknemers
--   - assign dossier-eigenaar (set_employee_owner RPC — unchanged)
-- No Gebruikers admin, no create/edit/delete of werkgevers beyond assignment scope.
-- =============================================================================

-- can_manage_clients: admin only (back_office no longer creates clients)
CREATE OR REPLACE FUNCTION public.can_manage_clients()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

-- Clients UPDATE: remove back_office global edit (keep select-all + assignment update)
DROP POLICY IF EXISTS "clients_update" ON public.clients;

CREATE POLICY "clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR public.user_has_client_access(id)
)
WITH CHECK (
    public.is_admin()
    OR public.user_has_client_access(id)
);

-- Referents: back_office no longer manages every werkgever — assignment-scoped like users
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
        AND public.user_has_client_access(client_id)
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
        AND public.user_has_client_access(client_id)
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
        AND public.user_has_client_access(client_id)
    )
)
WITH CHECK (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND public.user_has_client_access(client_id)
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
        AND public.user_has_client_access(client_id)
    )
);
