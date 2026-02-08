-- Update drivers_license_type from TEXT to TEXT[] to support multiple selections
-- Migration: update_drivers_license_type_to_array
-- Created: 2025-02-08

-- Step 1: Create a new column with array type
ALTER TABLE employee_details 
  ADD COLUMN IF NOT EXISTS drivers_license_type_new TEXT[];

-- Step 2: Migrate existing data
-- Convert single string values to arrays
UPDATE employee_details
SET drivers_license_type_new = 
  CASE 
    WHEN drivers_license_type IS NULL THEN NULL
    WHEN drivers_license_type = '' THEN NULL
    ELSE ARRAY[drivers_license_type]
  END
WHERE drivers_license_type_new IS NULL;

-- Step 3: Drop old column
ALTER TABLE employee_details 
  DROP COLUMN IF EXISTS drivers_license_type;

-- Step 4: Rename new column to original name
ALTER TABLE employee_details 
  RENAME COLUMN drivers_license_type_new TO drivers_license_type;

-- Step 5: Update column comment
COMMENT ON COLUMN employee_details.drivers_license_type IS 'Driver license types as array (e.g., ["B", "C", "A"]). Can contain multiple values like B (Auto), C (Vrachtwagen), D (Bus), E (Aanhangwagen), A (Motor), AM (Bromfiets), A1, A2, BE, CE, DE.';

