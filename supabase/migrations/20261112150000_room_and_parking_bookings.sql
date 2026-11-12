-- Room and parking bookings.
-- Admins manage locations and spaces. Authenticated users can read the
-- calendar and create their own bookings. Only admins can cancel.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT locations_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT locations_address_check CHECK (address IS NULL OR char_length(address) <= 200)
);

CREATE TABLE IF NOT EXISTS public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NULL,
  notes TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT spaces_kind_check CHECK (kind IN ('room', 'parking')),
  CONSTRAINT spaces_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT spaces_capacity_check CHECK (capacity IS NULL OR (capacity >= 1 AND capacity <= 500)),
  CONSTRAINT spaces_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500)
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  booked_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  booker_name TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT bookings_note_check CHECK (note IS NULL OR char_length(note) <= 1000),
  CONSTRAINT bookings_duration_check CHECK (
    ends_at > starts_at
    AND ends_at <= starts_at + interval '12 hours'
  ),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    space_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
);

CREATE TABLE IF NOT EXISTS public.booking_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  CONSTRAINT booking_guests_email_check CHECK (char_length(btrim(email)) BETWEEN 3 AND 320),
  CONSTRAINT booking_guests_booking_email_key UNIQUE (booking_id, email)
);

CREATE INDEX IF NOT EXISTS idx_spaces_location_kind
  ON public.spaces(location_id, kind, name);

CREATE INDEX IF NOT EXISTS idx_bookings_space_starts
  ON public.bookings(space_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_bookings_booked_by_starts
  ON public.bookings(booked_by, starts_at);

CREATE INDEX IF NOT EXISTS idx_booking_guests_booking
  ON public.booking_guests(booking_id);

-- -----------------------------------------------------------------------------
-- Booker name is copied from users so colleagues can see who booked
-- without read access to the users table.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bookings_set_booker_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  display_name text;
BEGIN
  IF NEW.booked_by IS NULL THEN
    IF NEW.booker_name IS NULL OR btrim(NEW.booker_name) = '' THEN
      NEW.booker_name := 'Onbekend';
    END IF;
    RETURN NEW;
  END IF;

  SELECT btrim(concat_ws(
    ' ',
    nullif(btrim(first_name), ''),
    nullif(btrim(last_name), '')
  ))
  INTO display_name
  FROM public.users
  WHERE id = NEW.booked_by;

  IF display_name IS NULL OR display_name = '' THEN
    SELECT nullif(btrim(email), '')
    INTO display_name
    FROM public.users
    WHERE id = NEW.booked_by;
  END IF;

  NEW.booker_name := COALESCE(display_name, 'Onbekend');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_booker_name ON public.bookings;
CREATE TRIGGER bookings_set_booker_name
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_set_booker_name();

REVOKE ALL ON FUNCTION public.bookings_set_booker_name() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bookings_set_booker_name() TO authenticated;

-- -----------------------------------------------------------------------------
-- Refuse to delete a space or location that still has a future booking.
-- Deactivating (active = false) stays allowed.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_space_delete_with_future_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE space_id = OLD.id
      AND ends_at > now()
  ) THEN
    RAISE EXCEPTION 'Deze ruimte heeft nog toekomstige reserveringen. Annuleer die eerst.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS spaces_prevent_delete_with_future_bookings ON public.spaces;
CREATE TRIGGER spaces_prevent_delete_with_future_bookings
BEFORE DELETE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION public.prevent_space_delete_with_future_bookings();

CREATE OR REPLACE FUNCTION public.prevent_location_delete_with_future_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.spaces s ON s.id = b.space_id
    WHERE s.location_id = OLD.id
      AND b.ends_at > now()
  ) THEN
    RAISE EXCEPTION 'Deze locatie heeft nog toekomstige reserveringen. Annuleer die eerst.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS locations_prevent_delete_with_future_bookings ON public.locations;
CREATE TRIGGER locations_prevent_delete_with_future_bookings
BEFORE DELETE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.prevent_location_delete_with_future_bookings();

REVOKE ALL ON FUNCTION public.prevent_space_delete_with_future_bookings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_location_delete_with_future_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_space_delete_with_future_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_location_delete_with_future_bookings() TO authenticated;

CREATE OR REPLACE FUNCTION public.booking_guests_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));

  IF (
    SELECT count(*)
    FROM public.booking_guests
    WHERE booking_id = NEW.booking_id
  ) >= 20 THEN
    RAISE EXCEPTION 'U kunt maximaal 20 extra genodigden toevoegen.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_guests_limit ON public.booking_guests;
CREATE TRIGGER booking_guests_limit
BEFORE INSERT ON public.booking_guests
FOR EACH ROW EXECUTE FUNCTION public.booking_guests_limit();

REVOKE ALL ON FUNCTION public.booking_guests_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_guests_limit() TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.booking_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_guests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_admin_all" ON public.locations;
DROP POLICY IF EXISTS "locations_select" ON public.locations;
DROP POLICY IF EXISTS "spaces_admin_all" ON public.spaces;
DROP POLICY IF EXISTS "spaces_select" ON public.spaces;
DROP POLICY IF EXISTS "bookings_admin_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_admin_delete" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "booking_guests_admin_all" ON public.booking_guests;
DROP POLICY IF EXISTS "booking_guests_select" ON public.booking_guests;
DROP POLICY IF EXISTS "booking_guests_insert" ON public.booking_guests;

CREATE POLICY "locations_admin_all"
ON public.locations
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "locations_select"
ON public.locations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "spaces_admin_all"
ON public.spaces
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "spaces_select"
ON public.spaces
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "bookings_select"
ON public.bookings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "bookings_insert"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  booked_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    JOIN public.locations l ON l.id = s.location_id
    WHERE s.id = space_id
      AND s.active
      AND l.active
  )
);

CREATE POLICY "bookings_admin_delete"
ON public.bookings
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "booking_guests_admin_all"
ON public.booking_guests
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "booking_guests_select"
ON public.booking_guests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.booked_by = auth.uid()
  )
);

CREATE POLICY "booking_guests_insert"
ON public.booking_guests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_id
      AND b.booked_by = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spaces TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.booking_guests TO authenticated;
