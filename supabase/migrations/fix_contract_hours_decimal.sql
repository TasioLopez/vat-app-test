-- Fix contract_hours column to support decimal values
-- Change from integer to numeric(4,1) to support values like 15.5, 24.0, etc.

ALTER TABLE employee_details 
ALTER COLUMN contract_hours TYPE NUMERIC(4,1);

-- Add a comment to clarify the column purpose
COMMENT ON COLUMN employee_details.contract_hours IS 'Contract hours per week, supports decimal values (e.g., 15.5, 24.0)';
