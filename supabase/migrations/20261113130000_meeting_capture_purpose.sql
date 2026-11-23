-- Purpose tag so multiple gesprekken can publish one bron per use (intake / VGR).
ALTER TABLE public.meeting_captures
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'intake';

ALTER TABLE public.meeting_captures
  DROP CONSTRAINT IF EXISTS meeting_captures_purpose_check;

ALTER TABLE public.meeting_captures
  ADD CONSTRAINT meeting_captures_purpose_check
  CHECK (purpose IN ('intake', 'vgr', 'overig'));

CREATE INDEX IF NOT EXISTS idx_meeting_captures_employee_purpose_status
  ON public.meeting_captures(employee_id, purpose, status);
