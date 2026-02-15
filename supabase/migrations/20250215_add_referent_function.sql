-- Add referent_function to clients (contact person job title, e.g. "Teammanager")
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referent_function text;
