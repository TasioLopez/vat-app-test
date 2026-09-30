-- =============================================================================
-- Restore back_office ability to create werkgevers (clients INSERT).
-- Back office still: sees all clients/employees, assigns coach via set_employee_owner;
-- cannot delete clients or access Gebruikers; client UPDATE stays assignment-scoped.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_manage_clients()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_admin() OR public.is_back_office();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;
