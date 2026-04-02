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
-- RLS: kb_article_chunks — deny authenticated direct access
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
SELECT 'tp-part-' || n, 'Part ' || n, 'Trajectplan Builder — part ' || n, n, 'trajectplan_builder', c.id
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
