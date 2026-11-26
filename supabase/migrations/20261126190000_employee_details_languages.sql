-- Structured non-Dutch languages on employee_details (staging).
-- Dutch skills remain dutch_speaking / dutch_writing / dutch_reading.

ALTER TABLE employee_details
ADD COLUMN IF NOT EXISTS languages jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN employee_details.languages IS
  'Non-Dutch language proficiency rows: [{language, level}] using Goed|Voldoende|Matig (or free-text level). Nederlands stays in dutch_*.';

-- Soft shape check: must be a JSON array (element validation is application-side).
ALTER TABLE employee_details
DROP CONSTRAINT IF EXISTS chk_employee_details_languages_array;

ALTER TABLE employee_details
ADD CONSTRAINT chk_employee_details_languages_array
CHECK (jsonb_typeof(languages) = 'array');
