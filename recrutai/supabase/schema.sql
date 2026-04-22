-- ═══════════════════════════════════════════
--  RecrutAI — Schéma Supabase
--  À exécuter dans l'éditeur SQL Supabase
-- ═══════════════════════════════════════════

-- TABLE clients
CREATE TABLE IF NOT EXISTS clients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  contact_name       TEXT NOT NULL DEFAULT '',
  contact_email      TEXT NOT NULL DEFAULT '',
  notification_email TEXT NOT NULL,
  sector             TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_clients" ON clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE jobs
CREATE TABLE IF NOT EXISTS jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  location         TEXT NOT NULL DEFAULT '',
  contract_type    TEXT NOT NULL DEFAULT 'CDI',
  description      TEXT NOT NULL DEFAULT '',
  score_threshold  INTEGER NOT NULL DEFAULT 60 CHECK (score_threshold >= 0 AND score_threshold <= 100),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_jobs" ON jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLE applications
CREATE TABLE IF NOT EXISTS applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_name   TEXT,
  candidate_email  TEXT,
  cv_file_path     TEXT NOT NULL,
  cv_text          TEXT,
  score            INTEGER CHECK (score >= 0 AND score <= 100),
  justification    TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_approval', 'qualified', 'rejected', 'error')),
  email_sent_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all_applications" ON applications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
--  Storage bucket cvs — à créer via le dashboard
--  puis coller ces policies dans l'éditeur SQL
-- ═══════════════════════════════════════════

-- Policies Storage (bucket "cvs" doit exister d'abord)
CREATE POLICY "authenticated_upload_cvs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cvs');

CREATE POLICY "authenticated_read_cvs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cvs');

CREATE POLICY "authenticated_delete_cvs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cvs');
