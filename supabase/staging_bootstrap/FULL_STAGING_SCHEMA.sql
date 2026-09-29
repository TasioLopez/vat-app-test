-- =============================================================================
-- STAGING BOOTSTRAP â€” Block 1/2: core baseline (tables missing from migrations)
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
  phone text,
  plaats text,
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


-- =============================================================================
-- STAGING BOOTSTRAP — Block 2/2: feature tables + final RLS
-- Run AFTER PASTE_1_baseline.sql succeeds.
-- =============================================================================

-- >>> BEGIN supabase/migrations/create_mijn_stem_table.sql
-- Create the mijn_stem_documents table
CREATE TABLE IF NOT EXISTS mijn_stem_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'error')),
  writing_style JSONB,
  error_message TEXT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_user_id ON mijn_stem_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_status ON mijn_stem_documents(status);
CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_created_at ON mijn_stem_documents(created_at DESC);

-- Enable Row Level Security
ALTER TABLE mijn_stem_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to manage their own documents
DROP POLICY IF EXISTS "Users can manage their own documents" ON mijn_stem_documents;
CREATE POLICY "Users can manage their own documents" ON mijn_stem_documents
  FOR ALL USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_mijn_stem_documents_updated_at ON mijn_stem_documents;
CREATE TRIGGER update_mijn_stem_documents_updated_at
    BEFORE UPDATE ON mijn_stem_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- >>> END supabase/migrations/create_mijn_stem_table.sql

-- >>> BEGIN supabase/migrations/20250317000000_create_referents_and_migrate.sql
-- =============================================================================
-- MULTI-REFERENT: create referents table, employees.referent_id, tp_meta columns, backfill
-- =============================================================================

-- 1. Create referents table
CREATE TABLE IF NOT EXISTS public.referents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    phone text,
    email text,
    referent_function text,
    gender text,
    display_order int,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- At most one is_default = true per client_id (enforced by partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_referents_one_default_per_client
ON public.referents (client_id)
WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_referents_client_id ON public.referents(client_id);

-- RLS: same as client access (users can manage referents for clients they are associated with)
ALTER TABLE public.referents ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "referents_admin_all"
ON public.referents
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Standard users: SELECT/INSERT/UPDATE/DELETE for clients they have access to
CREATE POLICY "referents_select"
ON public.referents
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
);

CREATE POLICY "referents_insert"
ON public.referents
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
);

CREATE POLICY "referents_update"
ON public.referents
FOR UPDATE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
)
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
);

CREATE POLICY "referents_delete"
ON public.referents
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_client_access(client_id)
);

-- 2. Add employees.referent_id
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS referent_id uuid REFERENCES public.referents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_referent_id ON public.employees(referent_id);

-- 3. Add referent snapshot columns to tp_meta (if not present)
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_name text;
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_phone text;
-- client_referent_email may already exist
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_email text;
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_function text;
ALTER TABLE public.tp_meta ADD COLUMN IF NOT EXISTS client_referent_gender text;

-- 4. Backfill: one referent per client from clients.referent_*, set employees.referent_id
INSERT INTO public.referents (client_id, first_name, last_name, phone, email, referent_function, gender, is_default)
SELECT
    c.id,
    c.referent_first_name,
    c.referent_last_name,
    c.referent_phone,
    c.referent_email,
    c.referent_function,
    NULL,
    true
FROM public.clients c
WHERE (
    (c.referent_first_name IS NOT NULL AND c.referent_first_name <> '')
    OR (c.referent_last_name IS NOT NULL AND c.referent_last_name <> '')
    OR (c.referent_phone IS NOT NULL AND c.referent_phone <> '')
    OR (c.referent_email IS NOT NULL AND c.referent_email <> '')
    OR (c.referent_function IS NOT NULL AND c.referent_function <> '')
)
AND NOT EXISTS (SELECT 1 FROM public.referents r WHERE r.client_id = c.id);

-- Set employees.referent_id to their client's default referent
UPDATE public.employees e
SET referent_id = r.id
FROM public.referents r
WHERE r.client_id = e.client_id
  AND r.is_default = true
  AND e.client_id IS NOT NULL;

-- >>> END supabase/migrations/20250317000000_create_referents_and_migrate.sql

-- >>> BEGIN supabase/migrations/20260401120000_help_center_kb_tickets.sql
-- Help center: KB, embeddings, support tickets, storage bucket
-- Relies on public.is_admin() from add_employees_rls_policies.sql

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- KB categories (hierarchical; slug globally unique)
-- ---------------------------------------------------------------------------
CREATE TABLE public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  tool_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_categories_parent ON public.kb_categories(parent_id);
CREATE INDEX idx_kb_categories_tool_key ON public.kb_categories(tool_key);

-- ---------------------------------------------------------------------------
-- KB articles (Markdown body; EN/NL linked via translation_group_id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_group_id uuid NOT NULL,
  locale text NOT NULL CHECK (locale IN ('en', 'nl')),
  category_id uuid NOT NULL REFERENCES public.kb_categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  slug text NOT NULL,
  body text NOT NULL DEFAULT '',
  excerpt text,
  published boolean NOT NULL DEFAULT true,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (locale, slug),
  UNIQUE (translation_group_id, locale)
);

CREATE INDEX idx_kb_articles_category ON public.kb_articles(category_id);
CREATE INDEX idx_kb_articles_locale_published ON public.kb_articles(locale, published);
CREATE INDEX idx_kb_articles_search ON public.kb_articles USING gin(search_vector);

CREATE OR REPLACE FUNCTION public.kb_articles_search_vector_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.locale = 'nl' THEN
    NEW.search_vector :=
      setweight(to_tsvector('dutch', coalesce(NEW.title, '')), 'A') ||
      setweight(to_tsvector('dutch', coalesce(NEW.body, '')), 'B');
  ELSE
    NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_articles_search_vector_trigger ON public.kb_articles;
CREATE TRIGGER kb_articles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, body, locale ON public.kb_articles
  FOR EACH ROW EXECUTE PROCEDURE public.kb_articles_search_vector_update();

-- ---------------------------------------------------------------------------
-- Chunks + embeddings (1536 = text-embedding-3-small default dimensions)
-- Server-side only via service role; no client SELECT
-- ---------------------------------------------------------------------------
CREATE TABLE public.kb_article_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, chunk_index)
);

CREATE INDEX idx_kb_article_chunks_article ON public.kb_article_chunks(article_id);
CREATE INDEX IF NOT EXISTS kb_article_chunks_embedding_hnsw
  ON public.kb_article_chunks
  USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Ticket categories (reference data)
-- ---------------------------------------------------------------------------
CREATE TABLE public.support_ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_en text NOT NULL,
  label_nl text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Support tickets
-- ---------------------------------------------------------------------------
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.support_ticket_categories(id),
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')
  ),
  priority text NOT NULL DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),
  assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  closed_reason text,
  internal_notes text,
  escalation_chat_transcript jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  first_admin_touch_at timestamptz
);

CREATE INDEX idx_support_tickets_requester ON public.support_tickets(requester_id);
CREATE INDEX idx_support_tickets_assignee ON public.support_tickets(assignee_id);
CREATE INDEX idx_support_tickets_status_created ON public.support_tickets(status, created_at);
CREATE INDEX idx_support_tickets_category ON public.support_tickets(category_id);

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id);

-- ---------------------------------------------------------------------------
-- Helpers for RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_owns_ticket(check_ticket_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = check_ticket_id AND st.requester_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.user_owns_ticket(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: kb_categories
-- ---------------------------------------------------------------------------
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY "kb_categories_select_authenticated"
  ON public.kb_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "kb_categories_admin_all"
  ON public.kb_categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: kb_articles
-- ---------------------------------------------------------------------------
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles FORCE ROW LEVEL SECURITY;

CREATE POLICY "kb_articles_select_published_or_admin"
  ON public.kb_articles FOR SELECT TO authenticated
  USING (public.is_admin() OR published = true);

CREATE POLICY "kb_articles_admin_write"
  ON public.kb_articles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: kb_article_chunks â€” deny authenticated direct access
-- ---------------------------------------------------------------------------
ALTER TABLE public.kb_article_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_article_chunks FORCE ROW LEVEL SECURITY;

-- No policies for authenticated = service role bypasses RLS for API routes

-- ---------------------------------------------------------------------------
-- RLS: support_ticket_categories (read all, write admin)
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY "support_ticket_categories_select"
  ON public.support_ticket_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "support_ticket_categories_admin"
  ON public.support_ticket_categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: support_tickets
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_select_own_or_admin"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.is_admin());

CREATE POLICY "support_tickets_insert_own"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "support_tickets_update_admin"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "support_tickets_delete_admin"
  ON public.support_tickets FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: support_ticket_messages
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY "support_ticket_messages_select"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.user_owns_ticket(ticket_id)
      AND is_internal = false
    )
  );

CREATE POLICY "support_ticket_messages_insert"
  ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin())
    OR (
      public.user_owns_ticket(ticket_id)
      AND is_internal = false
      AND author_id = auth.uid()
    )
  );

CREATE POLICY "support_ticket_messages_update_admin"
  ON public.support_ticket_messages FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "support_ticket_messages_delete_admin"
  ON public.support_ticket_messages FOR DELETE TO authenticated
  USING (public.is_admin());

-- Requesters need to UPDATE tickets they own when creating first message? 
-- Actually INSERT ticket doesn't require message. Escalation creates ticket with transcript only.
-- If we allow requester to add follow-up messages, INSERT on messages is covered.

-- ---------------------------------------------------------------------------
-- Storage: kb-media bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('kb-media', 'kb-media', false, 52428800)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Policies on storage.objects (Supabase standard schema)
DROP POLICY IF EXISTS "kb_media_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "kb_media_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "kb_media_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "kb_media_admin_delete" ON storage.objects;

CREATE POLICY "kb_media_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kb-media');

CREATE POLICY "kb_media_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kb-media' AND public.is_admin());

CREATE POLICY "kb_media_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kb-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'kb-media' AND public.is_admin());

CREATE POLICY "kb_media_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kb-media' AND public.is_admin());

-- ---------------------------------------------------------------------------
-- Seeds: KB categories
-- ---------------------------------------------------------------------------
INSERT INTO public.kb_categories (slug, title, description, sort_order, tool_key, parent_id)
VALUES
  ('trajectplan-builder', 'Trajectplan Builder', 'Help articles for the Trajectplan Builder tool', 1, 'trajectplan_builder', NULL),
  ('account-access', 'Account & access', 'Login, permissions, and account settings', 2, NULL, NULL);

-- Subcategories under Trajectplan Builder (parent set via subselect)
INSERT INTO public.kb_categories (slug, title, description, sort_order, tool_key, parent_id)
SELECT 'tp-part-' || n, 'Part ' || n, 'Trajectplan Builder â€” part ' || n, n, 'trajectplan_builder', c.id
FROM public.kb_categories c
CROSS JOIN generate_series(1, 5) AS n
WHERE c.slug = 'trajectplan-builder';

-- ---------------------------------------------------------------------------
-- Seeds: ticket categories
-- ---------------------------------------------------------------------------
INSERT INTO public.support_ticket_categories (slug, label_en, label_nl, sort_order) VALUES
  ('trajectplan-builder', 'Trajectplan Builder', 'Trajectplan Builder', 1),
  ('account-access', 'Account & access', 'Account & toegang', 2),
  ('data-import-export', 'Data & import/export', 'Data & import/export', 3),
  ('bug', 'Bug / something broken', 'Bug / iets kapot', 4),
  ('how-to', 'How-to / training', 'How-to / training', 5),
  ('feature-request', 'Feature request', 'Featureverzoek', 6),
  ('other', 'Other', 'Overig', 7);

-- ---------------------------------------------------------------------------
-- Sample article (English)
-- ---------------------------------------------------------------------------
INSERT INTO public.kb_articles (
  translation_group_id, locale, category_id, title, slug, body, excerpt, published, published_at
)
SELECT
  s.tg,
  'en',
  c.id,
  'Welcome to the Knowledge Center',
  'welcome-knowledge-center',
  E'# Welcome\n\nThis is a sample article. Replace it with real content.\n\nYou can use **markdown**, images from the media library, and more.',
  'Getting started with the help center.',
  true,
  now()
FROM (SELECT gen_random_uuid() AS tg) AS s
CROSS JOIN public.kb_categories c
WHERE c.slug = 'trajectplan-builder'
LIMIT 1;

-- updated_at touch helper
CREATE OR REPLACE FUNCTION public.help_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_categories_updated_at ON public.kb_categories;
CREATE TRIGGER kb_categories_updated_at
  BEFORE UPDATE ON public.kb_categories
  FOR EACH ROW EXECUTE PROCEDURE public.help_set_updated_at();

DROP TRIGGER IF EXISTS kb_articles_updated_at ON public.kb_articles;
CREATE TRIGGER kb_articles_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE PROCEDURE public.help_set_updated_at();

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE PROCEDURE public.help_set_updated_at();

COMMENT ON TABLE public.kb_article_chunks IS 'Embeddings maintained by Next.js API using service role; no direct client access.';

-- ---------------------------------------------------------------------------
-- RPC: vector similarity (service role / server only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_locale text
)
RETURNS TABLE (
  chunk_id uuid,
  article_id uuid,
  chunk_content text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT c.id AS chunk_id,
    c.article_id,
    c.content AS chunk_content,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM public.kb_article_chunks c
  INNER JOIN public.kb_articles a ON a.id = c.article_id
  WHERE a.published = true
    AND a.locale = filter_locale
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ---------------------------------------------------------------------------
-- RPC: full-text search on articles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_kb_articles(
  search_query text,
  filter_locale text,
  result_limit int
)
RETURNS TABLE (
  article_id uuid,
  title text,
  slug text,
  excerpt text,
  headline text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT a.id AS article_id,
    a.title,
    a.slug,
    a.excerpt,
    ts_headline(
      (CASE WHEN filter_locale = 'nl' THEN 'dutch' ELSE 'english' END)::regconfig,
      coalesce(a.body, ''),
      plainto_tsquery(
        (CASE WHEN filter_locale = 'nl' THEN 'dutch' ELSE 'english' END)::regconfig,
        search_query
      ),
      'StartSel=**, StopSel=**, MaxFragments=2, MinWords=5, MaxWords=35'
    ) AS headline
  FROM public.kb_articles a
  WHERE a.published = true
    AND a.locale = filter_locale
    AND a.search_vector @@ plainto_tsquery(
      (CASE WHEN filter_locale = 'nl' THEN 'dutch' ELSE 'english' END)::regconfig,
      search_query
    )
  ORDER BY ts_rank(a.search_vector, plainto_tsquery(
    (CASE WHEN filter_locale = 'nl' THEN 'dutch' ELSE 'english' END)::regconfig,
    search_query
  )) DESC
  LIMIT result_limit;
$$;

-- >>> END supabase/migrations/20260401120000_help_center_kb_tickets.sql

-- >>> BEGIN supabase/migrations/20260402120000_help_kb_nl_labels.sql
-- Nederlands: kenniscategorieÃ«n en voorbeeldartikel (NL) voor gebruikerssite

UPDATE public.kb_categories
SET title = 'Trajectplan Builder',
    description = 'Helparticle voor de Trajectplan Builder'
WHERE slug = 'trajectplan-builder';

UPDATE public.kb_categories
SET title = 'Account & toegang',
    description = 'Inloggen, rechten en accountinstellingen'
WHERE slug = 'account-access';

UPDATE public.kb_categories c
SET title = 'Deel ' || (regexp_match(c.slug, '^tp-part-(\d+)$'))[1],
    description =
      'Trajectplan Builder â€” deel ' || (regexp_match(c.slug, '^tp-part-(\d+)$'))[1]
WHERE c.slug ~ '^tp-part-[0-9]+$';

-- NL-welkomstartikel: zelfde vertaalgroep als EN-voorbeeld, indien aanwezig
INSERT INTO public.kb_articles (
  translation_group_id,
  locale,
  category_id,
  title,
  slug,
  body,
  excerpt,
  published,
  published_at
)
SELECT a.translation_group_id,
  'nl'::text,
  a.category_id,
  'Welkom bij het Kenniscentrum',
  'welcome-knowledge-center',
  E'# Welkom\n\nDit is een voorbeeldartikel. Vervang dit door echte inhoud.\n\nJe kunt **markdown** gebruiken, afbeeldingen uit de mediatheek, en meer.',
  'Aan de slag met het helpcentrum.',
  true,
  now()
FROM public.kb_articles a
WHERE a.locale = 'en'
  AND a.slug = 'welcome-knowledge-center'
  AND NOT EXISTS (
    SELECT 1 FROM public.kb_articles x WHERE x.locale = 'nl' AND x.slug = 'welcome-knowledge-center'
  )
LIMIT 1;

-- >>> END supabase/migrations/20260402120000_help_kb_nl_labels.sql

-- >>> BEGIN supabase/migrations/20260403120000_kb_categories_reorder_rpc.sql
-- Atomic reorder/reparent for kb_categories (sequential updates in one transaction function)
CREATE OR REPLACE FUNCTION public.apply_kb_category_reorder(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  el jsonb;
BEGIN
  FOR el IN SELECT jsonb_array_elements(p_items)
  LOOP
    UPDATE public.kb_categories
    SET
      parent_id = CASE
        WHEN el->>'parentId' IS NULL OR (el->>'parentId') = '' THEN NULL
        ELSE (el->>'parentId')::uuid
      END,
      sort_order = (el->>'sortOrder')::int
    WHERE id = (el->>'id')::uuid;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_kb_category_reorder(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_kb_category_reorder(jsonb) TO service_role;

-- >>> END supabase/migrations/20260403120000_kb_categories_reorder_rpc.sql

-- >>> BEGIN supabase/migrations/20260414120000_cv_documents.sql
-- CV builder: documents and version history per werknemer
-- Migration: 20260414120000_cv_documents

CREATE TABLE IF NOT EXISTS public.cv_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'CV',
  template_key TEXT NOT NULL DEFAULT 'modern_professional',
  accent_color TEXT NOT NULL DEFAULT '#00A3CC',
  status TEXT NOT NULL DEFAULT 'draft',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_documents_employee_id ON public.cv_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_cv_documents_updated_at ON public.cv_documents(employee_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.cv_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  payload_json JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_versions_document ON public.cv_versions(cv_document_id, created_at DESC);

COMMENT ON TABLE public.cv_documents IS 'Saved CV instances per employee (inline-edited content in payload_json)';
COMMENT ON TABLE public.cv_versions IS 'Optional history snapshots when CV is saved';

CREATE OR REPLACE FUNCTION public.cv_documents_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cv_documents_updated_at ON public.cv_documents;
CREATE TRIGGER cv_documents_updated_at
BEFORE UPDATE ON public.cv_documents
FOR EACH ROW EXECUTE FUNCTION public.cv_documents_set_updated_at();

-- RLS (same access model as employee_details: admin OR user_has_employee_access)
ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cv_documents_admin_all" ON public.cv_documents;
DROP POLICY IF EXISTS "cv_documents_select" ON public.cv_documents;
DROP POLICY IF EXISTS "cv_documents_insert" ON public.cv_documents;
DROP POLICY IF EXISTS "cv_documents_update" ON public.cv_documents;
DROP POLICY IF EXISTS "cv_documents_delete" ON public.cv_documents;

CREATE POLICY "cv_documents_admin_all"
ON public.cv_documents
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "cv_documents_select"
ON public.cv_documents
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "cv_documents_insert"
ON public.cv_documents
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "cv_documents_update"
ON public.cv_documents
FOR UPDATE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
)
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "cv_documents_delete"
ON public.cv_documents
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

ALTER TABLE public.cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_versions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cv_versions_admin_all" ON public.cv_versions;
DROP POLICY IF EXISTS "cv_versions_select" ON public.cv_versions;
DROP POLICY IF EXISTS "cv_versions_insert" ON public.cv_versions;
DROP POLICY IF EXISTS "cv_versions_update" ON public.cv_versions;
DROP POLICY IF EXISTS "cv_versions_delete" ON public.cv_versions;

CREATE POLICY "cv_versions_admin_all"
ON public.cv_versions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "cv_versions_select"
ON public.cv_versions
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.cv_documents d
      WHERE d.id = cv_versions.cv_document_id
      AND public.user_has_employee_access(d.employee_id)
    )
);

CREATE POLICY "cv_versions_insert"
ON public.cv_versions
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.cv_documents d
      WHERE d.id = cv_versions.cv_document_id
      AND public.user_has_employee_access(d.employee_id)
    )
);

CREATE POLICY "cv_versions_delete"
ON public.cv_versions
FOR DELETE
TO authenticated
USING (
    NOT public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.cv_documents d
      WHERE d.id = cv_versions.cv_document_id
      AND public.user_has_employee_access(d.employee_id)
    )
);

-- >>> END supabase/migrations/20260414120000_cv_documents.sql

-- >>> BEGIN supabase/migrations/20260415120000_help_kb_full_taxonomy.sql
-- Full KB taxonomy: new root categories, idempotent upserts, TP step labels, deprecate sample EN welcome

-- New and existing roots (globally unique slug). Align sort_order with help hub navigation.
INSERT INTO public.kb_categories (slug, title, description, sort_order, tool_key, parent_id)
VALUES
  ('aan-de-slag', 'Aan de slag', 'Starten met de applicatie en het kenniscentrum.', 10, NULL, NULL),
  ('account-access', 'Account & toegang', 'Inloggen, rechten en accountinstellingen.', 20, NULL, NULL),
  ('dashboard', 'Dashboard', 'Startpagina en overzichten.', 30, NULL, NULL),
  ('werkgevers', 'Werkgevers', 'Werkgevers (clients) beheren.', 40, NULL, NULL),
  ('werknemers', 'Werknemers', 'Werknemers en trajecten.', 50, NULL, NULL),
  ('trajectplan-builder', 'Trajectplan Bouwer', 'Het trajectplan per werknemer opstellen.', 60, 'trajectplan_builder', NULL),
  ('tp-documenten', 'TP-documenten', 'Opgeslagen trajectplan-PDF''s bekijken.', 70, NULL, NULL),
  ('helpcentrum', 'Helpcentrum & ondersteuning', 'Zoeken, chat en supporttickets.', 80, NULL, NULL),
  ('instellingen', 'Instellingen', 'Profiel, wachtwoord en Mijn Stem.', 90, NULL, NULL),
  ('beheer-admin', 'Beheer (administrators)', 'Help beheren en gebruikers (alleen admin).', 100, NULL, NULL),
  ('vgr', 'VGR', 'VGR-module (gepland).', 110, NULL, NULL)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  tool_key = COALESCE(EXCLUDED.tool_key, public.kb_categories.tool_key),
  parent_id = EXCLUDED.parent_id;

-- Ensure TP step rows exist (idempotent if already seeded)
INSERT INTO public.kb_categories (slug, title, description, sort_order, tool_key, parent_id)
SELECT 'tp-part-' || n::text,
  'Part ' || n::text,
  'Trajectplan Bouwer â€” deel ' || n::text,
  n,
  'trajectplan_builder',
  c.id
FROM public.kb_categories c
CROSS JOIN generate_series(1, 5) AS n
WHERE c.slug = 'trajectplan-builder'
ON CONFLICT (slug) DO NOTHING;

-- Trajectplan substappen: keep slugs tp-part-1..5, align titles with bouwer UI
UPDATE public.kb_categories
SET
  title = v.title,
  description = v.description
FROM (VALUES
  ('tp-part-1', 'Voorblad', 'Trajectplan Bouwer â€” voorblad en titelpagina.'),
  ('tp-part-2', 'Gegevens werknemer', 'Trajectplan Bouwer â€” persoons- en postgegevens.'),
  ('tp-part-3', 'TP deel 3', 'Trajectplan Bouwer â€” hoofddeel trajectplan.'),
  ('tp-part-4', 'Bijlage 1', 'Trajectplan Bouwer â€” bijlage.'),
  ('tp-part-5', 'Eindecontrole', 'Trajectplan Bouwer â€” controle en afronding.')
) AS v(slug, title, description)
WHERE public.kb_categories.slug = v.slug;

-- Sample EN article was for demo; end-user help is NL-first â€” hide from published list
UPDATE public.kb_articles
SET published = false, published_at = NULL
WHERE locale = 'en' AND slug = 'welcome-knowledge-center';

-- >>> END supabase/migrations/20260415120000_help_kb_full_taxonomy.sql

-- >>> BEGIN supabase/migrations/20260416120000_cv_photos_bucket.sql
-- Private bucket for CV portrait images (path: {employee_id}/{cv_document_id}/{filename})
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('cv-photos', 'cv-photos', false, 5242880)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "cv_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_delete" ON storage.objects;

-- First path segment must be a UUID; user must have employee access (or admin).
CREATE POLICY "cv_photos_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  )
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

-- >>> END supabase/migrations/20260416120000_cv_photos_bucket.sql

-- >>> BEGIN supabase/migrations/20260420120000_support_ticket_reads_notifications.sql
-- Per-user read cursor for support tickets (badges / unread counts)

CREATE TABLE public.support_ticket_reads (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id)
);

CREATE INDEX idx_support_ticket_reads_user ON public.support_ticket_reads(user_id);

ALTER TABLE public.support_ticket_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_reads FORCE ROW LEVEL SECURITY;

CREATE POLICY "support_ticket_reads_select_own"
  ON public.support_ticket_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "support_ticket_reads_insert"
  ON public.support_ticket_reads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
      AND (t.requester_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "support_ticket_reads_update"
  ON public.support_ticket_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
      AND (t.requester_id = auth.uid() OR public.is_admin())
    )
  );

-- Unread tickets for the current user as requester (non-staff replies)
CREATE OR REPLACE FUNCTION public.help_unread_ticket_count_requester()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT count(*)::integer
  FROM public.support_tickets t
  WHERE t.requester_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_ticket_messages m
    WHERE m.ticket_id = t.id
    AND m.is_internal = false
    AND m.author_id IS DISTINCT FROM auth.uid()
    AND m.created_at > coalesce(
      (
        SELECT r.last_read_at
        FROM public.support_ticket_reads r
        WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
      ),
      '-infinity'::timestamptz
    )
  );
$$;

-- Admin inbox: open tickets never opened by this admin, or new customer messages after last read
CREATE OR REPLACE FUNCTION public.help_unread_ticket_count_admin()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT count(*)::integer
  FROM public.support_tickets t
  WHERE public.is_admin()
  AND t.status NOT IN ('closed', 'resolved')
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.support_ticket_reads r
      WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
    )
    OR EXISTS (
      SELECT 1 FROM public.support_ticket_messages m
      WHERE m.ticket_id = t.id
      AND m.is_internal = false
      AND m.author_id = t.requester_id
      AND m.created_at > (
        SELECT r.last_read_at
        FROM public.support_ticket_reads r
        WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.help_unread_ticket_count_requester() TO authenticated;
GRANT EXECUTE ON FUNCTION public.help_unread_ticket_count_admin() TO authenticated;

-- >>> END supabase/migrations/20260420120000_support_ticket_reads_notifications.sql

-- >>> BEGIN supabase/migrations/20260421120000_help_unread_ticket_ids.sql
-- Ticket IDs that count as "unread" for notification UI (same predicates as count RPCs)

CREATE OR REPLACE FUNCTION public.help_unread_ticket_ids_requester()
RETURNS TABLE (ticket_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT t.id AS ticket_id
  FROM public.support_tickets t
  WHERE t.requester_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_ticket_messages m
    WHERE m.ticket_id = t.id
    AND m.is_internal = false
    AND m.author_id IS DISTINCT FROM auth.uid()
    AND m.created_at > coalesce(
      (
        SELECT r.last_read_at
        FROM public.support_ticket_reads r
        WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
      ),
      '-infinity'::timestamptz
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.help_unread_ticket_ids_admin()
RETURNS TABLE (ticket_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT t.id AS ticket_id
  FROM public.support_tickets t
  WHERE public.is_admin()
  AND t.status NOT IN ('closed', 'resolved')
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.support_ticket_reads r
      WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
    )
    OR EXISTS (
      SELECT 1 FROM public.support_ticket_messages m
      WHERE m.ticket_id = t.id
      AND m.is_internal = false
      AND m.author_id = t.requester_id
      AND m.created_at > (
        SELECT r.last_read_at
        FROM public.support_ticket_reads r
        WHERE r.user_id = auth.uid() AND r.ticket_id = t.id
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.help_unread_ticket_ids_requester() TO authenticated;
GRANT EXECUTE ON FUNCTION public.help_unread_ticket_ids_admin() TO authenticated;

-- >>> END supabase/migrations/20260421120000_help_unread_ticket_ids.sql

-- >>> BEGIN supabase/migrations/20260428120000_tp_instances_and_exports.sql
-- TP 2026 foundation: variant-aware TP drafts and immutable export snapshots

CREATE TABLE IF NOT EXISTS public.tp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('tp_legacy', 'tp_2026')),
  title TEXT NOT NULL DEFAULT 'Trajectplan',
  status TEXT NOT NULL DEFAULT 'draft',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tp_instances_employee_id
  ON public.tp_instances(employee_id);

CREATE INDEX IF NOT EXISTS idx_tp_instances_layout_status
  ON public.tp_instances(employee_id, layout_key, status);

CREATE INDEX IF NOT EXISTS idx_tp_instances_updated_at
  ON public.tp_instances(employee_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tp_instances_employee_layout_draft
  ON public.tp_instances(employee_id, layout_key)
  WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS public.tp_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tp_instance_id UUID NOT NULL REFERENCES public.tp_instances(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('tp_legacy', 'tp_2026')),
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT NULL,
  filename TEXT NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tp_exports_instance_id
  ON public.tp_exports(tp_instance_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tp_instances_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tp_instances_updated_at ON public.tp_instances;
CREATE TRIGGER tp_instances_updated_at
BEFORE UPDATE ON public.tp_instances
FOR EACH ROW EXECUTE FUNCTION public.tp_instances_set_updated_at();

-- Extend documents metadata so TP exports can be traced back to instance/snapshot
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS layout_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS tp_instance_id UUID NULL REFERENCES public.tp_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tp_export_id UUID NULL REFERENCES public.tp_exports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_tp_instance_id ON public.documents(tp_instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_tp_export_id ON public.documents(tp_export_id);
CREATE INDEX IF NOT EXISTS idx_documents_layout_key ON public.documents(layout_key);

-- RLS for tp_instances and tp_exports mirrors employee-level access model
ALTER TABLE public.tp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_instances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_instances_admin_all" ON public.tp_instances;
DROP POLICY IF EXISTS "tp_instances_select" ON public.tp_instances;
DROP POLICY IF EXISTS "tp_instances_insert" ON public.tp_instances;
DROP POLICY IF EXISTS "tp_instances_update" ON public.tp_instances;
DROP POLICY IF EXISTS "tp_instances_delete" ON public.tp_instances;

CREATE POLICY "tp_instances_admin_all"
ON public.tp_instances
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tp_instances_select"
ON public.tp_instances
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "tp_instances_insert"
ON public.tp_instances
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "tp_instances_update"
ON public.tp_instances
FOR UPDATE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
)
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "tp_instances_delete"
ON public.tp_instances
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

ALTER TABLE public.tp_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_exports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_exports_admin_all" ON public.tp_exports;
DROP POLICY IF EXISTS "tp_exports_select" ON public.tp_exports;
DROP POLICY IF EXISTS "tp_exports_insert" ON public.tp_exports;
DROP POLICY IF EXISTS "tp_exports_update" ON public.tp_exports;
DROP POLICY IF EXISTS "tp_exports_delete" ON public.tp_exports;

CREATE POLICY "tp_exports_admin_all"
ON public.tp_exports
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tp_exports_select"
ON public.tp_exports
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.tp_instances ti
    WHERE ti.id = tp_exports.tp_instance_id
      AND public.user_has_employee_access(ti.employee_id)
  )
);

CREATE POLICY "tp_exports_insert"
ON public.tp_exports
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.tp_instances ti
    WHERE ti.id = tp_exports.tp_instance_id
      AND public.user_has_employee_access(ti.employee_id)
  )
);

CREATE POLICY "tp_exports_delete"
ON public.tp_exports
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.tp_instances ti
    WHERE ti.id = tp_exports.tp_instance_id
      AND public.user_has_employee_access(ti.employee_id)
  )
);

-- >>> END supabase/migrations/20260428120000_tp_instances_and_exports.sql

-- >>> BEGIN supabase/migrations/20260617120000_cv_share_links.sql
-- CV share links for werknemer review (token-based guest access)
-- Migration: 20260617120000_cv_share_links

CREATE TABLE IF NOT EXISTS public.cv_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_document_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  recipient_email TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  last_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_share_links_token_hash ON public.cv_share_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_cv_share_links_cv_document ON public.cv_share_links(cv_document_id);
CREATE INDEX IF NOT EXISTS idx_cv_share_links_employee ON public.cv_share_links(employee_id);

-- One active share per CV document
CREATE UNIQUE INDEX IF NOT EXISTS idx_cv_share_links_one_active_per_cv
ON public.cv_share_links(cv_document_id)
WHERE revoked_at IS NULL;

COMMENT ON TABLE public.cv_share_links IS 'Token-based share links for werknemer CV review without app account';

ALTER TABLE public.cv_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_share_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cv_share_links_admin_all" ON public.cv_share_links;
DROP POLICY IF EXISTS "cv_share_links_advisor_select" ON public.cv_share_links;
DROP POLICY IF EXISTS "cv_share_links_advisor_insert" ON public.cv_share_links;
DROP POLICY IF EXISTS "cv_share_links_advisor_update" ON public.cv_share_links;

CREATE POLICY "cv_share_links_admin_all"
ON public.cv_share_links
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "cv_share_links_advisor_select"
ON public.cv_share_links
FOR SELECT
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "cv_share_links_advisor_insert"
ON public.cv_share_links
FOR INSERT
TO authenticated
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
    AND created_by = auth.uid()
);

CREATE POLICY "cv_share_links_advisor_update"
ON public.cv_share_links
FOR UPDATE
TO authenticated
USING (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
)
WITH CHECK (
    NOT public.is_admin()
    AND public.user_has_employee_access(employee_id)
);

-- >>> END supabase/migrations/20260617120000_cv_share_links.sql

-- >>> BEGIN supabase/migrations/add_access_tracking_to_existing_tables.sql
-- Add last_accessed_at and last_modified_at to employee_users
ALTER TABLE employee_users 
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_employee_users_last_accessed 
ON employee_users(user_id, last_accessed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_employee_users_last_modified 
ON employee_users(user_id, last_modified_at DESC NULLS LAST);

-- Add similar columns to user_clients if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_clients') THEN
    ALTER TABLE user_clients 
    ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;
    
    CREATE INDEX IF NOT EXISTS idx_user_clients_last_accessed 
    ON user_clients(user_id, last_accessed_at DESC NULLS LAST);
    
    CREATE INDEX IF NOT EXISTS idx_user_clients_last_modified 
    ON user_clients(user_id, last_modified_at DESC NULLS LAST);
  END IF;
END $$;


-- >>> END supabase/migrations/add_access_tracking_to_existing_tables.sql

-- >>> BEGIN supabase/migrations/20260619120000_open_access_model.sql
-- =============================================================================
-- Open access model: all authenticated users can view/edit werkgevers & werknemers.
-- DELETE on employees, clients, referents remains admin-only.
-- Activity tracking moves to user_entity_activity (decoupled from assignments).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Activity tracking table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_entity_activity (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('employee', 'client')),
  entity_id UUID NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  last_modified_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_entity_activity_user_accessed
  ON public.user_entity_activity(user_id, last_accessed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_user_entity_activity_user_modified
  ON public.user_entity_activity(user_id, last_modified_at DESC NULLS LAST);

ALTER TABLE public.user_entity_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entity_activity FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_entity_activity_own_all" ON public.user_entity_activity;
CREATE POLICY "user_entity_activity_own_all"
ON public.user_entity_activity
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Backfill from legacy assignment/tracking tables
INSERT INTO public.user_entity_activity (user_id, entity_type, entity_id, last_accessed_at, last_modified_at)
SELECT user_id, 'employee', employee_id, last_accessed_at, last_modified_at
FROM public.employee_users
ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET
  last_accessed_at = GREATEST(
    public.user_entity_activity.last_accessed_at,
    EXCLUDED.last_accessed_at
  ),
  last_modified_at = GREATEST(
    public.user_entity_activity.last_modified_at,
    EXCLUDED.last_modified_at
  );

INSERT INTO public.user_entity_activity (user_id, entity_type, entity_id, last_accessed_at, last_modified_at)
SELECT user_id, 'client', client_id, last_accessed_at, last_modified_at
FROM public.user_clients
ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET
  last_accessed_at = GREATEST(
    public.user_entity_activity.last_accessed_at,
    EXCLUDED.last_accessed_at
  ),
  last_modified_at = GREATEST(
    public.user_entity_activity.last_modified_at,
    EXCLUDED.last_modified_at
  );

-- -----------------------------------------------------------------------------
-- 2. Helper functions: authenticated = has access (not assignment-based)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.user_has_employee_access(check_employee_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

-- -----------------------------------------------------------------------------
-- 3. Admin-only DELETE on top-level entities
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
DROP POLICY IF EXISTS "referents_delete" ON public.referents;

-- -----------------------------------------------------------------------------
-- 4. Clients RLS (was not in repo migrations previously)
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_admin_all" ON public.clients;
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_admin_all"
ON public.clients
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "clients_select"
ON public.clients
FOR SELECT
TO authenticated
USING (NOT public.is_admin());

CREATE POLICY "clients_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin());

CREATE POLICY "clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (NOT public.is_admin())
WITH CHECK (NOT public.is_admin());

-- No standard-user DELETE policy: only admins via clients_admin_all

-- -----------------------------------------------------------------------------
-- 5. CV photos storage: any authenticated user (helper already updated)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "cv_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_delete" ON storage.objects;

CREATE POLICY "cv_photos_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "cv_photos_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "cv_photos_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "cv_photos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND auth.uid() IS NOT NULL
  );

-- >>> END supabase/migrations/20260619120000_open_access_model.sql

-- >>> BEGIN supabase/migrations/20260624120000_vgr_instances_and_exports.sql
-- VGR foundation: draft instances and immutable export snapshots

CREATE TABLE IF NOT EXISTS public.vgr_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('vgr')),
  title TEXT NOT NULL DEFAULT 'VGR',
  status TEXT NOT NULL DEFAULT 'draft',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_employee_id
  ON public.vgr_instances(employee_id);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_layout_status
  ON public.vgr_instances(employee_id, layout_key, status);

CREATE INDEX IF NOT EXISTS idx_vgr_instances_updated_at
  ON public.vgr_instances(employee_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vgr_instances_employee_layout_draft
  ON public.vgr_instances(employee_id, layout_key)
  WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS public.vgr_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vgr_instance_id UUID NOT NULL REFERENCES public.vgr_instances(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL CHECK (layout_key IN ('vgr')),
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT NULL,
  filename TEXT NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vgr_exports_instance_id
  ON public.vgr_exports(vgr_instance_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.vgr_instances_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vgr_instances_updated_at ON public.vgr_instances;
CREATE TRIGGER vgr_instances_updated_at
BEFORE UPDATE ON public.vgr_instances
FOR EACH ROW EXECUTE FUNCTION public.vgr_instances_set_updated_at();

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS vgr_instance_id UUID NULL REFERENCES public.vgr_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vgr_export_id UUID NULL REFERENCES public.vgr_exports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_vgr_instance_id ON public.documents(vgr_instance_id);
CREATE INDEX IF NOT EXISTS idx_documents_vgr_export_id ON public.documents(vgr_export_id);

ALTER TABLE public.vgr_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vgr_instances FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vgr_instances_admin_all" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_select" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_insert" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_update" ON public.vgr_instances;
DROP POLICY IF EXISTS "vgr_instances_delete" ON public.vgr_instances;

CREATE POLICY "vgr_instances_admin_all"
ON public.vgr_instances
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "vgr_instances_select"
ON public.vgr_instances
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_instances_insert"
ON public.vgr_instances
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_instances_update"
ON public.vgr_instances
FOR UPDATE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
)
WITH CHECK (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

CREATE POLICY "vgr_instances_delete"
ON public.vgr_instances
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND public.user_has_employee_access(employee_id)
);

ALTER TABLE public.vgr_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vgr_exports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vgr_exports_admin_all" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_select" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_insert" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_update" ON public.vgr_exports;
DROP POLICY IF EXISTS "vgr_exports_delete" ON public.vgr_exports;

CREATE POLICY "vgr_exports_admin_all"
ON public.vgr_exports
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "vgr_exports_select"
ON public.vgr_exports
FOR SELECT
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);

CREATE POLICY "vgr_exports_insert"
ON public.vgr_exports
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);

CREATE POLICY "vgr_exports_delete"
ON public.vgr_exports
FOR DELETE
TO authenticated
USING (
  NOT public.is_admin()
  AND EXISTS (
    SELECT 1
    FROM public.vgr_instances vi
    WHERE vi.id = vgr_exports.vgr_instance_id
      AND public.user_has_employee_access(vi.employee_id)
  )
);

-- >>> END supabase/migrations/20260624120000_vgr_instances_and_exports.sql

-- >>> BEGIN supabase/migrations/20260706120000_security_rls_users_documents_storage.sql
-- Security RLS: users, documents, storage.objects (documents bucket), tp_meta, tp_docs, user_clients
-- Open-access model preserved: authenticated advisors may access all employee/client data.

-- -----------------------------------------------------------------------------
-- public.users
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_service" ON public.users;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No authenticated self-insert/update; signup uses service role API routes.

-- -----------------------------------------------------------------------------
-- public.documents
-- -----------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_authenticated_all" ON public.documents;

CREATE POLICY "documents_authenticated_all"
  ON public.documents FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- storage.objects â€” documents bucket
-- Open-access: any authenticated advisor may access employee document paths.
-- Mijn Stem uploads live under {auth.uid()}/ and are scoped to the owning user.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_storage_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_mijn_stem_own" ON storage.objects;

CREATE POLICY "documents_storage_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid() IS NOT NULL
      AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    )
  );

CREATE POLICY "documents_storage_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  );

CREATE POLICY "documents_storage_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  );

CREATE POLICY "documents_storage_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  );

-- -----------------------------------------------------------------------------
-- public.tp_meta
-- -----------------------------------------------------------------------------
ALTER TABLE public.tp_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_meta FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_meta_authenticated_all" ON public.tp_meta;

CREATE POLICY "tp_meta_authenticated_all"
  ON public.tp_meta FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- public.tp_docs
-- -----------------------------------------------------------------------------
ALTER TABLE public.tp_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_docs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_docs_authenticated_all" ON public.tp_docs;

CREATE POLICY "tp_docs_authenticated_all"
  ON public.tp_docs FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- public.user_clients
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clients FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_clients_authenticated_all" ON public.user_clients;

CREATE POLICY "user_clients_authenticated_all"
  ON public.user_clients FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- mijn_stem_documents â€” explicit TO authenticated on existing policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.mijn_stem_documents;

CREATE POLICY "Users can manage their own documents"
  ON public.mijn_stem_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- >>> END supabase/migrations/20260706120000_security_rls_users_documents_storage.sql

-- >>> BEGIN supabase/migrations/20260706120100_api_rate_limits.sql
-- API rate limiting table (service role only; no client access)

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  rate_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits FORCE ROW LEVEL SECURITY;

-- No policies: authenticated/anon cannot access; service role bypasses RLS.

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.api_rate_limits%ROWTYPE;
  v_elapsed numeric;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.api_rate_limits WHERE rate_key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.api_rate_limits (rate_key, window_start, request_count)
    VALUES (p_key, v_now, 1);
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  v_elapsed := EXTRACT(EPOCH FROM (v_now - v_row.window_start));

  IF v_elapsed >= p_window_seconds THEN
    UPDATE public.api_rate_limits
    SET window_start = v_now, request_count = 1
    WHERE rate_key = p_key;
    allowed := true;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_row.request_count >= p_max_requests THEN
    allowed := false;
    retry_after_seconds := GREATEST(1, ceil(p_window_seconds - v_elapsed)::integer);
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.api_rate_limits
  SET request_count = request_count + 1
  WHERE rate_key = p_key;

  allowed := true;
  retry_after_seconds := 0;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON TABLE public.api_rate_limits FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.check_api_rate_limit(text, integer, integer) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(text, integer, integer) TO service_role;

-- >>> END supabase/migrations/20260706120100_api_rate_limits.sql

-- >>> BEGIN supabase/migrations/20260715230000_open_employees_rls.sql
-- Open employees RLS to match clients open-access model.
-- Standard users can SELECT/INSERT/UPDATE all employees.
-- DELETE remains admin-only (employees_delete was already dropped in 20260619120000).

DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
-- Keep delete admin-only; ensure no standard-user delete policy exists
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (NOT public.is_admin());

CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin());

CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (NOT public.is_admin())
WITH CHECK (NOT public.is_admin());

-- Admins continue via employees_admin_all (FOR ALL).
-- No employees_delete for standard users: only admins can delete.

-- >>> END supabase/migrations/20260715230000_open_employees_rls.sql

-- >>> BEGIN supabase/migrations/20260723120000_employee_owner_and_org_users.sql
-- Soft case ownership on employees + safe org user directory for non-admins.

-- -----------------------------------------------------------------------------
-- 1. employees.owner_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS owner_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_owner_id
  ON public.employees(owner_id);

-- Backfill: prefer user with latest last_modified_at, else latest last_accessed_at
WITH ranked AS (
  SELECT
    entity_id AS employee_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY entity_id
      ORDER BY
        last_modified_at DESC NULLS LAST,
        last_accessed_at DESC NULLS LAST
    ) AS rn
  FROM public.user_entity_activity
  WHERE entity_type = 'employee'
    AND entity_id IS NOT NULL
    AND user_id IS NOT NULL
)
UPDATE public.employees e
SET owner_id = ranked.user_id
FROM ranked
WHERE e.id = ranked.employee_id
  AND ranked.rn = 1
  AND e.owner_id IS NULL;

-- -----------------------------------------------------------------------------
-- 2. list_org_users â€” directory without signup tokens (bypasses users RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_org_users()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.role,
    u.status
  FROM public.users u
  WHERE u.status IS NULL
     OR u.status IN ('confirmed', 'invited', 'active')
  ORDER BY
    lower(coalesce(u.last_name, '')),
    lower(coalesce(u.first_name, '')),
    lower(u.email);
$$;

REVOKE ALL ON FUNCTION public.list_org_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_org_users() TO authenticated;

-- >>> END supabase/migrations/20260723120000_employee_owner_and_org_users.sql

-- >>> BEGIN supabase/migrations/20260802240000_cv_documents_parent_cv_id.sql
-- Link shared CV copies to their source document
-- Migration: 20260802240000_cv_documents_parent_cv_id

ALTER TABLE public.cv_documents
  ADD COLUMN IF NOT EXISTS parent_cv_id UUID NULL
  REFERENCES public.cv_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cv_documents_parent
  ON public.cv_documents(parent_cv_id);

COMMENT ON COLUMN public.cv_documents.parent_cv_id IS
  'When set, this row is a shared/review copy of the parent CV; guest edits target this row only.';

-- >>> END supabase/migrations/20260802240000_cv_documents_parent_cv_id.sql

-- >>> BEGIN supabase/migrations/20260826190000_restore_assignment_access.sql
-- =============================================================================
-- Restore assignment-based werknemer access.
-- Users see employees they own (owner_id) or that an admin assigned (employee_users).
-- Assigning a werkgever (user_clients) alone does NOT grant all employees of that client.
-- DELETE on employees remains admin-only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_employee_access(check_employee_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF check_employee_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.employee_id = check_employee_id
      AND eu.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = check_employee_id
      AND e.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.user_has_employee_access(UUID) TO authenticated;

-- Client access: explicit user_clients assignment OR any accessible employee under that client.
CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF check_client_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_clients uc
    WHERE uc.user_id = auth.uid()
      AND uc.client_id = check_client_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.client_id = check_client_id
      AND e.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.employee_users eu ON eu.employee_id = e.id
    WHERE e.client_id = check_client_id
      AND eu.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.user_has_client_access(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Backfill assignments from owner_id (so existing creators keep access)
-- -----------------------------------------------------------------------------
INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
SELECT e.owner_id, e.id, COALESCE(e.created_at, now())
FROM public.employees e
WHERE e.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.user_id = e.owner_id
      AND eu.employee_id = e.id
  );

-- -----------------------------------------------------------------------------
-- 3. Employees RLS (assignment-scoped; delete admin-only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.user_has_employee_access(id)
);

-- Allow create for any authenticated user (creator is auto-assigned in app + owner_id).
CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR public.user_has_employee_access(id)
)
WITH CHECK (
  public.is_admin()
  OR public.user_has_employee_access(id)
);

-- Ensure admin catch-all exists (admins must see all employees).
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
CREATE POLICY "employees_admin_all"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- No standard-user DELETE policy (admins via employees_admin_all).

-- -----------------------------------------------------------------------------
-- 4. employee_users: allow creator self-assign via owner_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employee_users_select" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_insert" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_update" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_delete" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_admin_all" ON public.employee_users;

CREATE POLICY "employee_users_admin_all"
ON public.employee_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "employee_users_select"
ON public.employee_users
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = employee_users.employee_id
      AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "employee_users_insert"
ON public.employee_users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_users.employee_id
        AND e.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "employee_users_update"
ON public.employee_users
FOR UPDATE
TO authenticated
USING (public.is_admin() OR user_id = auth.uid())
WITH CHECK (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "employee_users_delete"
ON public.employee_users
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = employee_users.employee_id
      AND e.owner_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 5. user_clients: own rows + admin (no open authenticated_all)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_clients_authenticated_all" ON public.user_clients;
DROP POLICY IF EXISTS "user_clients_select_own" ON public.user_clients;
DROP POLICY IF EXISTS "user_clients_insert_own" ON public.user_clients;
DROP POLICY IF EXISTS "user_clients_delete_own" ON public.user_clients;
DROP POLICY IF EXISTS "user_clients_admin_all" ON public.user_clients;

CREATE POLICY "user_clients_admin_all"
ON public.user_clients
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "user_clients_select_own"
ON public.user_clients
FOR SELECT
TO authenticated
USING (NOT public.is_admin() AND user_id = auth.uid());

CREATE POLICY "user_clients_insert_own"
ON public.user_clients
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin() AND user_id = auth.uid());

CREATE POLICY "user_clients_delete_own"
ON public.user_clients
FOR DELETE
TO authenticated
USING (NOT public.is_admin() AND user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. documents / tp_meta / tp_docs â€” employee-scoped
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_authenticated_all" ON public.documents;
DROP POLICY IF EXISTS "documents_admin_all" ON public.documents;
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;

CREATE POLICY "documents_admin_all"
ON public.documents
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "documents_select"
ON public.documents
FOR SELECT
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "documents_insert"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "documents_update"
ON public.documents
FOR UPDATE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id))
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "documents_delete"
ON public.documents
FOR DELETE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

DROP POLICY IF EXISTS "tp_meta_authenticated_all" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_admin_all" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_select" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_insert" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_update" ON public.tp_meta;
DROP POLICY IF EXISTS "tp_meta_delete" ON public.tp_meta;

CREATE POLICY "tp_meta_admin_all"
ON public.tp_meta
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tp_meta_select"
ON public.tp_meta
FOR SELECT
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_meta_insert"
ON public.tp_meta
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_meta_update"
ON public.tp_meta
FOR UPDATE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id))
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_meta_delete"
ON public.tp_meta
FOR DELETE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

DROP POLICY IF EXISTS "tp_docs_authenticated_all" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_admin_all" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_select" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_insert" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_update" ON public.tp_docs;
DROP POLICY IF EXISTS "tp_docs_delete" ON public.tp_docs;

CREATE POLICY "tp_docs_admin_all"
ON public.tp_docs
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tp_docs_select"
ON public.tp_docs
FOR SELECT
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_docs_insert"
ON public.tp_docs
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_docs_update"
ON public.tp_docs
FOR UPDATE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id))
WITH CHECK (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

CREATE POLICY "tp_docs_delete"
ON public.tp_docs
FOR DELETE
TO authenticated
USING (NOT public.is_admin() AND public.user_has_employee_access(employee_id));

-- -----------------------------------------------------------------------------
-- 7. Storage: documents + cv-photos require employee access for employee folders
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_storage_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_authenticated_delete" ON storage.objects;

CREATE POLICY "documents_storage_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

CREATE POLICY "documents_storage_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

CREATE POLICY "documents_storage_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

CREATE POLICY "documents_storage_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND (
          public.is_admin()
          OR public.user_has_employee_access(((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

DROP POLICY IF EXISTS "cv_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_delete" ON storage.objects;

CREATE POLICY "cv_photos_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  )
  WITH CHECK (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "cv_photos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cv-photos'
    AND (
      public.is_admin()
      OR public.user_has_employee_access((split_part(name, '/', 1))::uuid)
    )
  );

-- Referents delete stays admin-only; select/insert/update already use user_has_client_access.

-- >>> END supabase/migrations/20260826190000_restore_assignment_access.sql

-- >>> BEGIN supabase/migrations/20260827093000_fix_assignment_access_visibility.sql
-- =============================================================================
-- Fix assignment access: ensure admins see all employees, and backfill ownership
-- from activity / assignments so creators regain access.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Recreate admin catch-all + simplify SELECT/UPDATE policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
CREATE POLICY "employees_admin_all"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.user_has_employee_access(id)
);

DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR public.user_has_employee_access(id)
)
WITH CHECK (
  public.is_admin()
  OR public.user_has_employee_access(id)
);

-- Keep delete admin-only (no non-admin delete policy).

-- Ensure employee_users admin policy exists (UsersTable assignment UI).
DROP POLICY IF EXISTS "employee_users_admin_all" ON public.employee_users;
CREATE POLICY "employee_users_admin_all"
ON public.employee_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "employee_users_select" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_insert" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_update" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_delete" ON public.employee_users;

CREATE POLICY "employee_users_select"
ON public.employee_users
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = employee_users.employee_id
      AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "employee_users_insert"
ON public.employee_users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_users.employee_id
        AND e.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "employee_users_update"
ON public.employee_users
FOR UPDATE
TO authenticated
USING (public.is_admin() OR user_id = auth.uid())
WITH CHECK (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "employee_users_delete"
ON public.employee_users
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = employee_users.employee_id
      AND e.owner_id = auth.uid()
  )
);

-- employee_details admin catch-all (in case missing)
DROP POLICY IF EXISTS "employee_details_admin_all" ON public.employee_details;
CREATE POLICY "employee_details_admin_all"
ON public.employee_details
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Broader owner_id backfill from user_entity_activity
-- -----------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    entity_id AS employee_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY entity_id
      ORDER BY
        last_modified_at DESC NULLS LAST,
        last_accessed_at DESC NULLS LAST
    ) AS rn
  FROM public.user_entity_activity
  WHERE entity_type = 'employee'
    AND entity_id IS NOT NULL
    AND user_id IS NOT NULL
)
UPDATE public.employees e
SET owner_id = ranked.user_id
FROM ranked
WHERE e.id = ranked.employee_id
  AND ranked.rn = 1
  AND e.owner_id IS NULL;

-- If still null, prefer any existing employee_users assignee as owner.
WITH ranked_assign AS (
  SELECT
    employee_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id
      ORDER BY assigned_at ASC NULLS LAST
    ) AS rn
  FROM public.employee_users
  WHERE user_id IS NOT NULL
    AND employee_id IS NOT NULL
)
UPDATE public.employees e
SET owner_id = ranked_assign.user_id
FROM ranked_assign
WHERE e.id = ranked_assign.employee_id
  AND ranked_assign.rn = 1
  AND e.owner_id IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Sync employee_users from owner_id (creators keep access)
-- -----------------------------------------------------------------------------
INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
SELECT e.owner_id, e.id, COALESCE(e.created_at, now())
FROM public.employees e
WHERE e.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.user_id = e.owner_id
      AND eu.employee_id = e.id
  );

-- Also ensure every activity participant has an assignment row (multi-user dossiers).
-- Skip orphaned activity rows whose employee (or user) no longer exists.
INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
SELECT a.user_id, a.entity_id, COALESCE(a.last_modified_at, a.last_accessed_at, now())
FROM public.user_entity_activity a
JOIN public.employees e ON e.id = a.entity_id
JOIN public.users u ON u.id = a.user_id
WHERE a.entity_type = 'employee'
  AND a.entity_id IS NOT NULL
  AND a.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.user_id = a.user_id
      AND eu.employee_id = a.entity_id
  );

-- >>> END supabase/migrations/20260827093000_fix_assignment_access_visibility.sql

-- >>> BEGIN supabase/migrations/20260827094500_fix_employees_rls_recursion.sql
-- =============================================================================
-- Break RLS infinite recursion between employees <-> employee_users.
-- Error 42P17: infinite recursion detected in policy for relation "employees"
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helpers that NEVER re-enter RLS (SECURITY DEFINER + row_security off)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_assigned_to_employee(check_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_users eu
    WHERE eu.employee_id = check_employee_id
      AND eu.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_employee(check_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = check_employee_id
      AND e.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_employee_access(check_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    check_employee_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.employee_users eu
        WHERE eu.employee_id = check_employee_id
          AND eu.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.id = check_employee_id
          AND e.owner_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_has_client_access(check_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    check_client_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_clients uc
        WHERE uc.user_id = auth.uid()
          AND uc.client_id = check_client_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.client_id = check_client_id
          AND e.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.employee_users eu
        JOIN public.employees e ON e.id = eu.employee_id
        WHERE e.client_id = check_client_id
          AND eu.user_id = auth.uid()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_assigned_to_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_employee_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_client_access(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. employees policies: use row columns + assignment helper (no cross-policy subquery)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_admin_all"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- owner_id checked on the row itself (no subquery into employees).
-- assignment checked via SECURITY DEFINER helper (bypasses employee_users RLS).
CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.user_is_assigned_to_employee(id)
);

CREATE POLICY "employees_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "employees_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.user_is_assigned_to_employee(id)
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.user_is_assigned_to_employee(id)
);

-- Delete remains admin-only via employees_admin_all.

-- -----------------------------------------------------------------------------
-- 3. employee_users policies: NEVER subquery employees directly
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employee_users_admin_all" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_select" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_insert" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_update" ON public.employee_users;
DROP POLICY IF EXISTS "employee_users_delete" ON public.employee_users;

CREATE POLICY "employee_users_admin_all"
ON public.employee_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "employee_users_select"
ON public.employee_users
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_owns_employee(employee_id)
);

CREATE POLICY "employee_users_insert"
ON public.employee_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.user_owns_employee(employee_id)
);

CREATE POLICY "employee_users_update"
ON public.employee_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "employee_users_delete"
ON public.employee_users
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_owns_employee(employee_id)
);

-- >>> END supabase/migrations/20260827094500_fix_employees_rls_recursion.sql

-- >>> BEGIN supabase/migrations/20260901120000_add_back_office_role.sql
-- =============================================================================
-- Back office role: werkgever catalog management (create/delete any, see all)
-- while werknemer access stays assignment-scoped like standard users.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_back_office()
RETURNS BOOLEAN AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();

    RETURN user_role = 'back_office';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.is_back_office() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_clients()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_admin() OR public.is_back_office();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.can_manage_clients() TO authenticated;

-- Optional role constraint (skip if invalid rows exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_role_check'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_role_check
            CHECK (role IN ('admin', 'user', 'back_office'));
    END IF;
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'users_role_check not added: existing rows have invalid role values';
END $$;

-- -----------------------------------------------------------------------------
-- 2. Clients RLS â€” replace open non-admin model
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_admin_all" ON public.clients;
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_admin_all"
ON public.clients
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "clients_select"
ON public.clients
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
);

CREATE POLICY "clients_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_clients());

CREATE POLICY "clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
)
WITH CHECK (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
);

CREATE POLICY "clients_delete"
ON public.clients
FOR DELETE
TO authenticated
USING (public.can_manage_clients());

-- -----------------------------------------------------------------------------
-- 3. Referents RLS â€” back office manages referents on any werkgever
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "referents_select" ON public.referents;
DROP POLICY IF EXISTS "referents_insert" ON public.referents;
DROP POLICY IF EXISTS "referents_update" ON public.referents;
DROP POLICY IF EXISTS "referents_delete" ON public.referents;

CREATE POLICY "referents_select"
ON public.referents
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
);

CREATE POLICY "referents_insert"
ON public.referents
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
);

CREATE POLICY "referents_update"
ON public.referents
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
)
WITH CHECK (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
);

CREATE POLICY "referents_delete"
ON public.referents
FOR DELETE
TO authenticated
USING (
    public.is_admin()
    OR (
        NOT public.is_admin()
        AND (
            public.is_back_office()
            OR public.user_has_client_access(client_id)
        )
    )
);

-- >>> END supabase/migrations/20260901120000_add_back_office_role.sql

-- >>> BEGIN supabase/migrations/20260902140000_rework_back_office_permissions.sql
-- =============================================================================
-- Rework back_office: all clients visible to users; BO cannot delete clients;
-- BO sees all employees; owner changes via set_employee_owner RPC only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Clients RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_admin_all" ON public.clients;
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_admin_all"
ON public.clients
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- All authenticated users can list werkgevers (needed when creating werknemers).
CREATE POLICY "clients_select"
ON public.clients
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "clients_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_clients());

CREATE POLICY "clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
)
WITH CHECK (
    public.is_admin()
    OR public.is_back_office()
    OR public.user_has_client_access(id)
);

-- Delete: admin only (back_office cannot delete).
CREATE POLICY "clients_delete"
ON public.clients
FOR DELETE
TO authenticated
USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Employees SELECT â€” back_office sees all
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_select" ON public.employees;

CREATE POLICY "employees_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.is_back_office()
  OR owner_id = auth.uid()
  OR public.user_is_assigned_to_employee(id)
);

-- -----------------------------------------------------------------------------
-- 3. Secure owner change RPC (admin + back_office only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_employee_owner(
  p_employee_id uuid,
  p_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_back_office()) THEN
    RAISE EXCEPTION 'not authorized to set employee owner';
  END IF;

  IF p_employee_id IS NULL THEN
    RAISE EXCEPTION 'employee id required';
  END IF;

  IF p_owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = p_owner_id
  ) THEN
    RAISE EXCEPTION 'owner user not found';
  END IF;

  UPDATE public.employees
  SET owner_id = p_owner_id
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee not found';
  END IF;

  -- Keep dossier access for the new owner (historical owner_id â†’ employee_users sync).
  IF p_owner_id IS NOT NULL THEN
    INSERT INTO public.employee_users (user_id, employee_id, assigned_at)
    SELECT p_owner_id, p_employee_id, now()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.employee_users eu
      WHERE eu.user_id = p_owner_id
        AND eu.employee_id = p_employee_id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_employee_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_employee_owner(uuid, uuid) TO authenticated;

-- >>> END supabase/migrations/20260902140000_rework_back_office_permissions.sql

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    missing := array_append(missing, 'bucket:documents');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'cv-photos') THEN
    missing := array_append(missing, 'bucket:cv-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'kb-media') THEN
    missing := array_append(missing, 'bucket:kb-media');
  END IF;
  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Staging bootstrap incomplete: %', array_to_string(missing, ', ');
  END IF;
  RAISE NOTICE 'Staging bootstrap verification OK';
END;
$$;


