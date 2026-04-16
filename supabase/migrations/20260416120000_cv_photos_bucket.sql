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
