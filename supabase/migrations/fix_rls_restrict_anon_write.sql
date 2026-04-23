-- Migration sécurité : restreindre les policies anon en lecture seule
-- Les policies anon_all_* précédentes autorisaient DELETE/INSERT/UPDATE à n'importe qui
-- Un attaquant avec l'anon key publique pouvait supprimer TOUTES les données

-- Supprimer les policies anon trop permissives
DROP POLICY IF EXISTS "anon_all_jobs" ON jobs;
DROP POLICY IF EXISTS "anon_all_clients" ON clients;
DROP POLICY IF EXISTS "anon_all_applications" ON applications;

-- Remplacer par lecture seule pour anon (SELECT uniquement)
-- Les écritures (INSERT/UPDATE/DELETE) requièrent un rôle authenticated
CREATE POLICY "anon_select_jobs" ON jobs
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_clients" ON clients
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_applications" ON applications
  FOR SELECT TO anon USING (true);
