-- Private booking notes: calendar stays shared; notes only for owner/admin/back_office.

CREATE TABLE IF NOT EXISTS public.booking_notes (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.booking_notes (booking_id, body, updated_at)
SELECT b.id, COALESCE(b.note, ''), now()
FROM public.bookings b
WHERE b.note IS NOT NULL
  AND btrim(b.note) <> ''
ON CONFLICT (booking_id) DO NOTHING;

ALTER TABLE public.bookings DROP COLUMN IF EXISTS note;

ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_notes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_notes_admin_all" ON public.booking_notes;
DROP POLICY IF EXISTS "booking_notes_select" ON public.booking_notes;
DROP POLICY IF EXISTS "booking_notes_insert" ON public.booking_notes;
DROP POLICY IF EXISTS "booking_notes_update" ON public.booking_notes;
DROP POLICY IF EXISTS "booking_notes_delete" ON public.booking_notes;

CREATE POLICY "booking_notes_admin_all"
ON public.booking_notes
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_back_office())
WITH CHECK (public.is_admin() OR public.is_back_office());

CREATE POLICY "booking_notes_select"
ON public.booking_notes
FOR SELECT
TO authenticated
USING (
  NOT (public.is_admin() OR public.is_back_office())
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.booked_by = auth.uid()
  )
);

CREATE POLICY "booking_notes_insert"
ON public.booking_notes
FOR INSERT
TO authenticated
WITH CHECK (
  NOT (public.is_admin() OR public.is_back_office())
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.booked_by = auth.uid()
  )
);

CREATE POLICY "booking_notes_update"
ON public.booking_notes
FOR UPDATE
TO authenticated
USING (
  NOT (public.is_admin() OR public.is_back_office())
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.booked_by = auth.uid()
  )
)
WITH CHECK (
  NOT (public.is_admin() OR public.is_back_office())
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.booked_by = auth.uid()
  )
);

CREATE POLICY "booking_notes_delete"
ON public.booking_notes
FOR DELETE
TO authenticated
USING (
  NOT (public.is_admin() OR public.is_back_office())
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.booked_by = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.booking_notes_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_notes_updated_at ON public.booking_notes;
CREATE TRIGGER booking_notes_updated_at
BEFORE UPDATE ON public.booking_notes
FOR EACH ROW
EXECUTE FUNCTION public.booking_notes_set_updated_at();
