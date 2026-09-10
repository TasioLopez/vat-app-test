-- =============================================================================
-- STAGING BOOTSTRAP — Block 1/2: core baseline (tables missing from migrations)
-- Paste this FIRST into Supabase SQL Editor on the EMPTY staging project.
-- Then paste Block 2 (FULL_STAGING_SCHEMA_PART2.sql) OR run the combined file.
-- =============================================================================
-- Why: repo migrations assume users/clients/employees/documents/tp_* already exist.
-- This creates them in FINAL shape (post all historical ALTERs).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- users (id must match auth.users.id when invited users confirm)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  phone text,
  role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'user', 'back_office')),
  status text DEFAULT 'invited',
  signup_token text,
  signup_token_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  last_modified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ---------------------------------------------------------------------------
-- clients (werkgevers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  contact_email text,
  referent_first_name text,
  referent_last_name text,
  referent_email text,
  referent_phone text,
  referent_function text,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  last_modified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

-- ---------------------------------------------------------------------------
-- employees (werknemers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  referent_id uuid,
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  last_modified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_employees_client_id ON public.employees(client_id);
CREATE INDEX IF NOT EXISTS idx_employees_owner_id ON public.employees(owner_id);

-- ---------------------------------------------------------------------------
-- employee_details (1:1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  phone text,
  gender text,
  date_of_birth date,
  education_level text,
  education_name text,
  current_job text,
  contract_hours numeric,
  work_experience text,
  other_employers text,
  drivers_license boolean,
  drivers_license_type text[],
  has_transport boolean,
  transport_type text[],
  has_computer boolean,
  computer_skills text,
  computer_skills_description text,
  dutch_speaking text,
  dutch_reading text,
  dutch_writing text,
  ad_report_date date,
  is_ex_werknemer boolean DEFAULT false,
  autofilled_fields text[],
  field_content_hash jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_review_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_details_employee_id
  ON public.employee_details(employee_id);

-- ---------------------------------------------------------------------------
-- assignment tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_clients (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  last_modified_at timestamptz,
  PRIMARY KEY (user_id, client_id)
);

CREATE TABLE IF NOT EXISTS public.employee_users (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role text,
  assigned_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  last_modified_at timestamptz,
  PRIMARY KEY (user_id, employee_id)
);

-- ---------------------------------------------------------------------------
-- documents + tp legacy tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  url text NOT NULL,
  name text,
  type text,
  layout_key text,
  tp_instance_id uuid,
  tp_export_id uuid,
  vgr_instance_id uuid,
  vgr_export_id uuid,
  uploaded_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  last_modified_at timestamptz
);

-- Unique path per employee when url is storage path (historical constraint)
CREATE UNIQUE INDEX IF NOT EXISTS documents_employee_url_unique
  ON public.documents(employee_id, url)
  WHERE employee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tp_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  client_name text,
  client_referent_name text,
  client_referent_email text,
  client_referent_phone text,
  client_referent_function text,
  client_referent_gender text,
  advisor_initials text,
  intake_date date,
  registration_date date,
  first_sick_day date,
  tp_creation_date date,
  tp_start_date date,
  tp_end_date date,
  tp_lead_time numeric,
  fml_izp_lab_date date,
  fml_izp_lab_kind text,
  has_ad_report boolean,
  ad_report_date date,
  ad_report_concept boolean DEFAULT false,
  is_ex_werknemer boolean DEFAULT false,
  occupational_doctor_name text,
  occupational_doctor_org text,
  inleiding text,
  inleiding_sub text,
  sociale_achtergrond text,
  visie_werknemer text,
  persoonlijk_profiel text,
  prognose_bedrijfsarts text,
  praktische_belemmeringen text,
  advies_ad_passende_arbeid text,
  pow_meter text,
  visie_loopbaanadviseur text,
  visie_plaatsbaarheid text,
  zoekprofiel text,
  wettelijke_kaders text,
  trajectdoel_activiteiten text,
  akkoordtekst text,
  tp3_activities jsonb,
  bijlage_fases jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  last_modified_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.tp_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text,
  content text,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  last_modified_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Storage: documents bucket (not created by dated migrations)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ---------------------------------------------------------------------------
-- Core helper used by almost every later migration
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Minimal stubs; final definitions come from later migrations
CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_clients
    WHERE user_id = auth.uid() AND client_id = check_client_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.user_has_employee_access(check_employee_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employee_users
    WHERE employee_id = check_employee_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = check_employee_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.user_has_client_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_employee_access(UUID) TO authenticated;
