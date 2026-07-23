-- Soft case ownership on employees + safe org user directory for non-admins.

-- -----------------------------------------------------------------------------
-- 1. employees.owner_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS owner_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_owner_id
  ON public.employees(owner_id);

-- Backfill: prefer user with latest last_modified_at, else latest last_accessed_at
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

-- -----------------------------------------------------------------------------
-- 2. list_org_users — directory without signup tokens (bypasses users RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_org_users()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.role,
    u.status
  FROM public.users u
  WHERE u.status IS NULL
     OR u.status IN ('confirmed', 'invited', 'active')
  ORDER BY
    lower(coalesce(u.last_name, '')),
    lower(coalesce(u.first_name, '')),
    lower(u.email);
$$;

REVOKE ALL ON FUNCTION public.list_org_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_org_users() TO authenticated;
