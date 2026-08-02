-- Per-employee editable parenthetical for computer skills level (e.g. "SAP ERP, WMS")

ALTER TABLE public.employee_details
  ADD COLUMN IF NOT EXISTS computer_skills_description text;

COMMENT ON COLUMN public.employee_details.computer_skills_description IS
  'Editable description shown in parentheses after computer_skills level title';
