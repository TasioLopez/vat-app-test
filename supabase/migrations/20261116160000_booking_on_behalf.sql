-- Admins and back office may create a booking for another organisation user,
-- and may move an existing booking to another owner. The displayed name
-- follows that user. A normal user can still book only as themselves.

CREATE OR REPLACE FUNCTION public.booking_owner_display_name(owner_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  display_name text;
BEGIN
  IF owner_id IS NULL THEN
    RETURN 'Onbekend';
  END IF;

  SELECT btrim(concat_ws(
    ' ',
    nullif(btrim(first_name), ''),
    nullif(btrim(last_name), '')
  ))
  INTO display_name
  FROM public.users
  WHERE id = owner_id;

  IF display_name IS NULL OR display_name = '' THEN
    SELECT nullif(btrim(email), '')
    INTO display_name
    FROM public.users
    WHERE id = owner_id;
  END IF;

  RETURN COALESCE(display_name, 'Onbekend');
END;
$$;

CREATE OR REPLACE FUNCTION public.bookings_set_booker_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  NEW.booker_name := public.booking_owner_display_name(NEW.booked_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bookings_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.booked_by IS DISTINCT FROM OLD.booked_by THEN
    IF NOT (public.is_admin() OR public.is_back_office()) THEN
      RAISE EXCEPTION 'De reservering kan niet aan iemand anders worden toegewezen.';
    END IF;
    NEW.booker_name := public.booking_owner_display_name(NEW.booked_by);
  ELSE
    NEW.booker_name := OLD.booker_name;
  END IF;

  IF NEW.space_id IS DISTINCT FROM OLD.space_id THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.spaces s
      JOIN public.locations l ON l.id = s.location_id
      WHERE s.id = NEW.space_id
        AND s.active
        AND l.active
    ) THEN
      RAISE EXCEPTION 'Deze ruimte is niet beschikbaar.';
    END IF;
  END IF;

  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
CREATE POLICY "bookings_insert"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  booked_by IS NOT NULL
  AND (
    booked_by = auth.uid()
    OR public.is_admin()
    OR public.is_back_office()
  )
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    JOIN public.locations l ON l.id = s.location_id
    WHERE s.id = space_id
      AND s.active
      AND l.active
  )
);

REVOKE ALL ON FUNCTION public.booking_owner_display_name(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bookings_set_booker_name() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bookings_guard_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bookings_set_booker_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bookings_guard_update() TO authenticated;
