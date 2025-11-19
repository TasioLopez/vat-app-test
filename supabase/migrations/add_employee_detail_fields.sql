-- Add new columns to employee_details table for structured data
-- Migration: add_employee_detail_fields
-- Created: 2025-01-19

ALTER TABLE employee_details 
  ADD COLUMN IF NOT EXISTS education_name TEXT,
  ADD COLUMN IF NOT EXISTS drivers_license_type TEXT,
  ADD COLUMN IF NOT EXISTS transport_type TEXT;

-- Add helpful comments for documentation
COMMENT ON COLUMN employee_details.education_name IS 'Education specialty/course name (e.g., "Agogisch werk", "Bedrijfskunde")';
COMMENT ON COLUMN employee_details.drivers_license_type IS 'Driver license type (e.g., "B", "C", "D", "E", "A")';
COMMENT ON COLUMN employee_details.transport_type IS 'Type of transportation (e.g., "Autovoertuig", "Fiets", "Bromfiets", "Motor", "OV")';

