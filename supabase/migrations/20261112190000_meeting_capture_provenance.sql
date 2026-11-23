-- Keep the first transcript and where the verslag came from.
-- Intake still reads the published documents row, not these columns.

ALTER TABLE public.meeting_captures
  ADD COLUMN IF NOT EXISTS transcript_original_text TEXT NULL,
  ADD COLUMN IF NOT EXISTS transcript_source TEXT NULL,
  ADD COLUMN IF NOT EXISTS notes_origin TEXT NULL;

ALTER TABLE public.meeting_captures
  DROP CONSTRAINT IF EXISTS meeting_captures_transcript_source_check;

ALTER TABLE public.meeting_captures
  ADD CONSTRAINT meeting_captures_transcript_source_check
  CHECK (
    transcript_source IS NULL
    OR transcript_source IN ('upload', 'paste', 'recording')
  );

ALTER TABLE public.meeting_captures
  DROP CONSTRAINT IF EXISTS meeting_captures_notes_origin_check;

ALTER TABLE public.meeting_captures
  ADD CONSTRAINT meeting_captures_notes_origin_check
  CHECK (
    notes_origin IS NULL
    OR notes_origin IN ('generated', 'pasted', 'uploaded')
  );

UPDATE public.meeting_captures
SET transcript_original_text = transcript_text
WHERE transcript_original_text IS NULL
  AND transcript_text IS NOT NULL
  AND btrim(transcript_text) <> '';
