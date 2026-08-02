-- Update Dutch language skills to 4-level scale: Goed, Voldoende, Matig, Geen

UPDATE employee_details
SET
  dutch_speaking = CASE
    WHEN dutch_speaking IS NULL THEN NULL
    WHEN dutch_speaking IN ('Goed', 'G') THEN 'Goed'
    WHEN dutch_speaking IN ('Voldoende', 'Gemiddeld', 'Redelijk', 'R') THEN 'Voldoende'
    WHEN dutch_speaking IN ('Matig', 'Niet goed', 'Onvoldoende', 'O', 'Slecht', 'S') THEN 'Matig'
    WHEN dutch_speaking IN ('Geen', '1 - Geen') THEN 'Geen'
    ELSE NULL
  END,
  dutch_writing = CASE
    WHEN dutch_writing IS NULL THEN NULL
    WHEN dutch_writing IN ('Goed', 'G') THEN 'Goed'
    WHEN dutch_writing IN ('Voldoende', 'Gemiddeld', 'Redelijk', 'R') THEN 'Voldoende'
    WHEN dutch_writing IN ('Matig', 'Niet goed', 'Onvoldoende', 'O', 'Slecht', 'S') THEN 'Matig'
    WHEN dutch_writing IN ('Geen', '1 - Geen') THEN 'Geen'
    ELSE NULL
  END,
  dutch_reading = CASE
    WHEN dutch_reading IS NULL THEN NULL
    WHEN dutch_reading IN ('Goed', 'G') THEN 'Goed'
    WHEN dutch_reading IN ('Voldoende', 'Gemiddeld', 'Redelijk', 'R') THEN 'Voldoende'
    WHEN dutch_reading IN ('Matig', 'Niet goed', 'Onvoldoende', 'O', 'Slecht', 'S') THEN 'Matig'
    WHEN dutch_reading IN ('Geen', '1 - Geen') THEN 'Geen'
    ELSE NULL
  END;

ALTER TABLE employee_details
DROP CONSTRAINT IF EXISTS chk_dutch_speaking_level,
DROP CONSTRAINT IF EXISTS chk_dutch_writing_level,
DROP CONSTRAINT IF EXISTS chk_dutch_reading_level;

ALTER TABLE employee_details
ADD CONSTRAINT chk_dutch_speaking_level CHECK (
  dutch_speaking IS NULL OR dutch_speaking IN ('Goed', 'Voldoende', 'Matig', 'Geen')
),
ADD CONSTRAINT chk_dutch_writing_level CHECK (
  dutch_writing IS NULL OR dutch_writing IN ('Goed', 'Voldoende', 'Matig', 'Geen')
),
ADD CONSTRAINT chk_dutch_reading_level CHECK (
  dutch_reading IS NULL OR dutch_reading IN ('Goed', 'Voldoende', 'Matig', 'Geen')
);

COMMENT ON COLUMN employee_details.dutch_speaking IS 'Dutch speaking proficiency (4-level scale: Goed, Voldoende, Matig, Geen)';
COMMENT ON COLUMN employee_details.dutch_writing IS 'Dutch writing proficiency (4-level scale: Goed, Voldoende, Matig, Geen)';
COMMENT ON COLUMN employee_details.dutch_reading IS 'Dutch reading proficiency (4-level scale: Goed, Voldoende, Matig, Geen)';
