-- The reservation title is the name of the person it is booked for.

CREATE OR REPLACE FUNCTION public.bookings_set_booker_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  NEW.booker_name := public.booking_owner_display_name(NEW.booked_by);
  NEW.title := left(NEW.booker_name, 120);
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

  NEW.title := left(NEW.booker_name, 120);

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

UPDATE public.bookings
SET title = left(btrim(booker_name), 120)
WHERE char_length(btrim(booker_name)) >= 1;
