-- Migration : autoriser les utilisateurs anon (AM, recruteurs, managers sans session Supabase)
-- À exécuter dans l'éditeur SQL Supabase

-- jobs
DROP POLICY IF EXISTS "anon_all_jobs" ON jobs;
CREATE POLICY "anon_all_jobs" ON jobs
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- clients
DROP POLICY IF EXISTS "anon_all_clients" ON clients;
CREATE POLICY "anon_all_clients" ON clients
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- applications
DROP POLICY IF EXISTS "anon_all_applications" ON applications;
CREATE POLICY "anon_all_applications" ON applications
  FOR ALL TO anon USING (true) WITH CHECK (true);
