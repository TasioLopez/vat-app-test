-- =============================================================================
-- MULTI-REFERENT: create referents table, employees.referent_id, tp_meta columns, backfill
-- =============================================================================

-- 1. Create referents table
CREATE TABLE IF NOT EXISTS public.referents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    phone text,
    email text,
    referent_function text,
    gender text,
    display_order int,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- At most one is_default = true per client_id (enforced by partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_referents_one_default_per_client
ON public.referents (client_id)
WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_referents_client_id ON public.referents(client_id);

-- RLS: same as client access (users can manage referents for clients they are associated with)
ALTER TABLE public.referents ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "referents_admin_all"
ON public.referents
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Standard users: SELECT/INSERT/UPDATE/DELETE for clients they have access to
CREATE POLICY "referents_select"
ON public.referents
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
);

CREATE POLICY "referents_insert"
ON public.referents
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
);

CREATE POLICY "referents_update"
ON public.referents
FOR UPDATE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
)
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
);

CREATE POLICY "referents_delete"
ON public.referents
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
);

-- 2. Add employees.referent_id
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS referent_id uuid REFERENCES public.referents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_referent_id ON public.employees(referent_id);

-- 3. Add referent snapshot columns to tp_meta (if not present)
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_name text;
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_phone text;
-- client_referent_email may already exist
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_email text;
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_function text;
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_gender text;

-- 4. Backfill: one referent per client from clients.referent_*, set employees.referent_id
INSERT INTO public.referents (client_id, first_name, last_name, phone, email, referent_function, gender, is_default)
SELECT
    c.id,
    c.referent_first_name,
    c.referent_last_name,
    c.referent_phone,
    c.referent_email,
    c.referent_function,
    NULL,
    true
FROM public.clients c
WHERE (
    (c.referent_first_name IS NOT NULL AND c.referent_first_name <> '')
    OR (c.referent_last_name IS NOT NULL AND c.referent_last_name <> '')
    OR (c.referent_phone IS NOT NULL AND c.referent_phone <> '')
    OR (c.referent_email IS NOT NULL AND c.referent_email <> '')
    OR (c.referent_function IS NOT NULL AND c.referent_function <> '')
)
AND NOT EXISTS (SELECT 1 FROM public.referents r WHERE r.client_id = c.id);

-- Set employees.referent_id to their client's default referent
UPDATE public.employees e
SET referent_id = r.id
FROM public.referents r
WHERE r.client_id = e.client_id
  AND r.is_default = true
  AND e.client_id IS NOT NULL;
