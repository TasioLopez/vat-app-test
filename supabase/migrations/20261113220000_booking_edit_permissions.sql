-- Owners may update and delete their own bookings.
-- Back office and admins may update and delete any booking.
-- Locations and spaces stay admin-only.

DROP POLICY IF EXISTS "bookings_admin_delete" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;

CREATE POLICY "bookings_update"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_admin() OR public.is_back_office() OR booked_by = auth.uid())
WITH CHECK (public.is_admin() OR public.is_back_office() OR booked_by = auth.uid());

CREATE POLICY "bookings_delete"
ON public.bookings
FOR DELETE
TO authenticated
USING (public.is_admin() OR public.is_back_office() OR booked_by = auth.uid());

CREATE OR REPLACE FUNCTION public.bookings_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.booked_by IS DISTINCT FROM OLD.booked_by THEN
    RAISE EXCEPTION 'De reservering kan niet aan iemand anders worden toegewezen.';
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

  NEW.booker_name := OLD.booker_name;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_guard_update ON public.bookings;
CREATE TRIGGER bookings_guard_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_update();

REVOKE ALL ON FUNCTION public.bookings_guard_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bookings_guard_update() TO authenticated;

GRANT UPDATE ON public.bookings TO authenticated;
