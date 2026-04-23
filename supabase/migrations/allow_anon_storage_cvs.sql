-- Migration : autoriser les utilisateurs anon à accéder au bucket cvs
-- Les recruteurs/AMs/managers ont une session locale (localStorage) sans session Supabase.
-- Sans cette policy, le upload de CV échoue avec une erreur RLS.

DROP POLICY IF EXISTS "anon_upload_cvs"  ON storage.objects;
DROP POLICY IF EXISTS "anon_read_cvs"    ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_cvs"  ON storage.objects;

CREATE POLICY "anon_upload_cvs" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'cvs');

CREATE POLICY "anon_read_cvs" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'cvs');

CREATE POLICY "anon_delete_cvs" ON storage.objects
  FOR DELETE TO anon
  USING (bucket_id = 'cvs');
