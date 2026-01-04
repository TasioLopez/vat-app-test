-- Update language skills from BOOLEAN to TEXT (5-level scale)
-- Migration: update_language_skills_to_levels
-- Created: 2025-01-XX

-- Step 1: Create new columns with TEXT type
ALTER TABLE employee_details 
  ADD COLUMN IF NOT EXISTS dutch_speaking_new TEXT,
  ADD COLUMN IF NOT EXISTS dutch_writing_new TEXT,
  ADD COLUMN IF NOT EXISTS dutch_reading_new TEXT;

-- Step 2: Migrate existing boolean data
-- true → "3 - Gemiddeld" (default middle level)
-- false → "1 - Geen" (default no proficiency)
UPDATE employee_details
SET 
  dutch_speaking_new = CASE 
    WHEN dutch_speaking IS NULL THEN NULL
    WHEN dutch_speaking = true THEN '3 - Gemiddeld'
    ELSE '1 - Geen'
  END,
  dutch_writing_new = CASE 
    WHEN dutch_writing IS NULL THEN NULL
    WHEN dutch_writing = true THEN '3 - Gemiddeld'
    ELSE '1 - Geen'
  END,
  dutch_reading_new = CASE 
    WHEN dutch_reading IS NULL THEN NULL
    WHEN dutch_reading = true THEN '3 - Gemiddeld'
    ELSE '1 - Geen'
  END;

-- Step 3: Drop old columns
ALTER TABLE employee_details 
  DROP COLUMN IF EXISTS dutch_speaking,
  DROP COLUMN IF EXISTS dutch_writing,
  DROP COLUMN IF EXISTS dutch_reading;

-- Step 4: Rename new columns to original names
ALTER TABLE employee_details 
  RENAME COLUMN dutch_speaking_new TO dutch_speaking,
  RENAME COLUMN dutch_writing_new TO dutch_writing,
  RENAME COLUMN dutch_reading_new TO dutch_reading;

-- Step 5: Add CHECK constraints to ensure valid values
ALTER TABLE employee_details 
  ADD CONSTRAINT dutch_speaking_check 
    CHECK (dutch_speaking IS NULL OR dutch_speaking IN ('1 - Geen', '2 - Matig', '3 - Gemiddeld', '4 - Goed', '5 - Zeer goed')),
  ADD CONSTRAINT dutch_writing_check 
    CHECK (dutch_writing IS NULL OR dutch_writing IN ('1 - Geen', '2 - Matig', '3 - Gemiddeld', '4 - Goed', '5 - Zeer goed')),
  ADD CONSTRAINT dutch_reading_check 
    CHECK (dutch_reading IS NULL OR dutch_reading IN ('1 - Geen', '2 - Matig', '3 - Gemiddeld', '4 - Goed', '5 - Zeer goed'));

-- Step 6: Update column comments
COMMENT ON COLUMN employee_details.dutch_speaking IS 'Dutch speaking proficiency: 1 - Geen, 2 - Matig, 3 - Gemiddeld, 4 - Goed, 5 - Zeer goed';
COMMENT ON COLUMN employee_details.dutch_writing IS 'Dutch writing proficiency: 1 - Geen, 2 - Matig, 3 - Gemiddeld, 4 - Goed, 5 - Zeer goed';
COMMENT ON COLUMN employee_details.dutch_reading IS 'Dutch reading proficiency: 1 - Geen, 2 - Matig, 3 - Gemiddeld, 4 - Goed, 5 - Zeer goed';

