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
-- storage.objects — documents bucket
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
-- mijn_stem_documents — explicit TO authenticated on existing policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.mijn_stem_documents;

CREATE POLICY "Users can manage their own documents"
  ON public.mijn_stem_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
