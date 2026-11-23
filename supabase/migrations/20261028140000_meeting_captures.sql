-- Staging meeting captures: audio + transcript live here.
-- The accepted gespreksverslag is still a documents row (one per employee).

CREATE TABLE IF NOT EXISTS public.meeting_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_by UUID NULL,
  status TEXT NOT NULL DEFAULT 'recorded',
  audio_path TEXT NULL,
  transcript_text TEXT NULL,
  notes_text TEXT NULL,
  notes_document_id UUID NULL REFERENCES public.documents(id) ON DELETE SET NULL,
  consent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meeting_captures_status_check
    CHECK (status IN ('recorded', 'transcribed', 'notes_draft', 'accepted'))
);

CREATE INDEX IF NOT EXISTS idx_meeting_captures_employee
  ON public.meeting_captures(employee_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.meeting_captures_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meeting_captures_updated_at ON public.meeting_captures;
CREATE TRIGGER meeting_captures_updated_at
BEFORE UPDATE ON public.meeting_captures
FOR EACH ROW EXECUTE FUNCTION public.meeting_captures_set_updated_at();

ALTER TABLE public.meeting_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_captures FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_captures_admin_all" ON public.meeting_captures;
DROP POLICY IF EXISTS "meeting_captures_select" ON public.meeting_captures;
DROP POLICY IF EXISTS "meeting_captures_insert" ON public.meeting_captures;
DROP POLICY IF EXISTS "meeting_captures_update" ON public.meeting_captures;
DROP POLICY IF EXISTS "meeting_captures_delete" ON public.meeting_captures;

CREATE POLICY "meeting_captures_admin_all"
ON public.meeting_captures
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "meeting_captures_select"
ON public.meeting_captures
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "meeting_captures_insert"
ON public.meeting_captures
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "meeting_captures_update"
ON public.meeting_captures
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

CREATE POLICY "meeting_captures_delete"
ON public.meeting_captures
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);
