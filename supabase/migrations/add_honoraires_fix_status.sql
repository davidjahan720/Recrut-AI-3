-- Migration : ajouter honoraires + corriger le CHECK sur status
-- À exécuter dans l'éditeur SQL Supabase

-- 1. Ajouter la colonne honoraires (si elle n'existe pas déjà)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS honoraires NUMERIC(10,2);

-- 2. Supprimer l'ancienne contrainte CHECK sur status
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check;

-- 3. Recréer la contrainte avec 'inactive' inclus
ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('active', 'inactive', 'closed'));
