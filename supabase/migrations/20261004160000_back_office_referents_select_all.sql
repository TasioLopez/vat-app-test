-- =============================================================================
-- Back office can SELECT all referents (werkgever contact persons).
-- INSERT/UPDATE/DELETE stay assignment-scoped (or admin).
-- =============================================================================

DROP POLICY IF EXISTS "referents_select" ON public.referents;

CREATE POLICY "referents_select"
ON public.referents
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(client_id)
);
