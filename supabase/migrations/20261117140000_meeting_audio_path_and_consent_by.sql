-- Harden meeting_captures: consent actor + immutable consent; canonical audio_path only.

ALTER TABLE public.meeting_captures
  ADD COLUMN IF NOT EXISTS consent_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Block clearing/changing consent once set; bind audio_path to canonical pattern.
CREATE OR REPLACE FUNCTION public.meeting_captures_guard_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  canonical_webm TEXT;
  canonical_m4a TEXT;
  canonical_mp4 TEXT;
BEGIN
  -- Consent is append-only once recorded.
  IF OLD.consent_at IS NOT NULL THEN
    NEW.consent_at := OLD.consent_at;
    NEW.consent_by := OLD.consent_by;
  END IF;

  IF NEW.consent_at IS NOT NULL AND NEW.consent_by IS NULL AND OLD.consent_by IS NOT NULL THEN
    NEW.consent_by := OLD.consent_by;
  END IF;

  -- audio_path may be cleared, or set only to {employee_id}/meeting-audio/{id}.{ext}
  IF NEW.audio_path IS NOT NULL THEN
    canonical_webm := NEW.employee_id::text || '/meeting-audio/' || NEW.id::text || '.webm';
    canonical_m4a := NEW.employee_id::text || '/meeting-audio/' || NEW.id::text || '.m4a';
    canonical_mp4 := NEW.employee_id::text || '/meeting-audio/' || NEW.id::text || '.mp4';
    IF NEW.audio_path IS DISTINCT FROM canonical_webm
       AND NEW.audio_path IS DISTINCT FROM canonical_m4a
       AND NEW.audio_path IS DISTINCT FROM canonical_mp4 THEN
      RAISE EXCEPTION 'meeting_captures.audio_path must be canonical for employee/capture'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- employee_id is immutable (path binding depends on it).
  IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
    RAISE EXCEPTION 'meeting_captures.employee_id is immutable'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meeting_captures_guard_sensitive ON public.meeting_captures;
CREATE TRIGGER meeting_captures_guard_sensitive
BEFORE UPDATE ON public.meeting_captures
FOR EACH ROW
EXECUTE FUNCTION public.meeting_captures_guard_sensitive_columns();

-- Also reject bad audio_path on INSERT.
CREATE OR REPLACE FUNCTION public.meeting_captures_guard_insert_audio_path()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  canonical_webm TEXT;
  canonical_m4a TEXT;
  canonical_mp4 TEXT;
BEGIN
  IF NEW.audio_path IS NOT NULL THEN
    canonical_webm := NEW.employee_id::text || '/meeting-audio/' || NEW.id::text || '.webm';
    canonical_m4a := NEW.employee_id::text || '/meeting-audio/' || NEW.id::text || '.m4a';
    canonical_mp4 := NEW.employee_id::text || '/meeting-audio/' || NEW.id::text || '.mp4';
    IF NEW.audio_path IS DISTINCT FROM canonical_webm
       AND NEW.audio_path IS DISTINCT FROM canonical_m4a
       AND NEW.audio_path IS DISTINCT FROM canonical_mp4 THEN
      RAISE EXCEPTION 'meeting_captures.audio_path must be canonical for employee/capture'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meeting_captures_guard_insert_audio ON public.meeting_captures;
CREATE TRIGGER meeting_captures_guard_insert_audio
BEFORE INSERT ON public.meeting_captures
FOR EACH ROW
EXECUTE FUNCTION public.meeting_captures_guard_insert_audio_path();
