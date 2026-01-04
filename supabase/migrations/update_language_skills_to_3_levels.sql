-- Update language skills to 3-level scale
-- Convert existing 5-level values to 3-level values
ALTER TABLE employee_details
ALTER COLUMN dutch_speaking TYPE TEXT USING 
  CASE 
    WHEN dutch_speaking IN ('1 - Geen', '2 - Matig', 'Slecht', 'S') THEN 'Niet goed'
    WHEN dutch_speaking IN ('3 - Gemiddeld', 'Redelijk', 'R') THEN 'Gemiddeld'
    WHEN dutch_speaking IN ('4 - Goed', '5 - Zeer goed', 'Goed', 'G') THEN 'Goed'
    ELSE NULL
  END,
ALTER COLUMN dutch_writing TYPE TEXT USING 
  CASE 
    WHEN dutch_writing IN ('1 - Geen', '2 - Matig', 'Slecht', 'S') THEN 'Niet goed'
    WHEN dutch_writing IN ('3 - Gemiddeld', 'Redelijk', 'R') THEN 'Gemiddeld'
    WHEN dutch_writing IN ('4 - Goed', '5 - Zeer goed', 'Goed', 'G') THEN 'Goed'
    ELSE NULL
  END,
ALTER COLUMN dutch_reading TYPE TEXT USING 
  CASE 
    WHEN dutch_reading IN ('1 - Geen', '2 - Matig', 'Slecht', 'S') THEN 'Niet goed'
    WHEN dutch_reading IN ('3 - Gemiddeld', 'Redelijk', 'R') THEN 'Gemiddeld'
    WHEN dutch_reading IN ('4 - Goed', '5 - Zeer goed', 'Goed', 'G') THEN 'Goed'
    ELSE NULL
  END;

-- Update constraints
ALTER TABLE employee_details
DROP CONSTRAINT IF EXISTS chk_dutch_speaking_level,
DROP CONSTRAINT IF EXISTS chk_dutch_writing_level,
DROP CONSTRAINT IF EXISTS chk_dutch_reading_level;

ALTER TABLE employee_details
ADD CONSTRAINT chk_dutch_speaking_level CHECK (dutch_speaking IN ('Niet goed', 'Gemiddeld', 'Goed', NULL)),
ADD CONSTRAINT chk_dutch_writing_level CHECK (dutch_writing IN ('Niet goed', 'Gemiddeld', 'Goed', NULL)),
ADD CONSTRAINT chk_dutch_reading_level CHECK (dutch_reading IN ('Niet goed', 'Gemiddeld', 'Goed', NULL));

COMMENT ON COLUMN employee_details.dutch_speaking IS 'Dutch speaking proficiency (3-level scale: Niet goed, Gemiddeld, Goed)';
COMMENT ON COLUMN employee_details.dutch_writing IS 'Dutch writing proficiency (3-level scale: Niet goed, Gemiddeld, Goed)';
COMMENT ON COLUMN employee_details.dutch_reading IS 'Dutch reading proficiency (3-level scale: Niet goed, Gemiddeld, Goed)';

