-- Update transport_type from TEXT to TEXT[] to support multiple selections
-- Migration: update_transport_type_to_array
-- Created: 2025-01-XX

-- Step 1: Create a new column with array type
ALTER TABLE employee_details 
  ADD COLUMN IF NOT EXISTS transport_type_new TEXT[];

-- Step 2: Migrate existing data
-- Convert single string values to arrays
UPDATE employee_details
SET transport_type_new = 
  CASE 
    WHEN transport_type IS NULL THEN NULL
    WHEN transport_type = '' THEN NULL
    ELSE ARRAY[transport_type]
  END
WHERE transport_type_new IS NULL;

-- Step 3: Drop old column
ALTER TABLE employee_details 
  DROP COLUMN IF EXISTS transport_type;

-- Step 4: Rename new column to original name
ALTER TABLE employee_details 
  RENAME COLUMN transport_type_new TO transport_type;

-- Step 5: Update column comment
COMMENT ON COLUMN employee_details.transport_type IS 'Type of transportation as array (e.g., ["Auto", "Fiets", "OV"]). Can contain multiple values.';

