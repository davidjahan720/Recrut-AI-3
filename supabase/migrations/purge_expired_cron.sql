-- Migration : planifie la purge automatique des candidatures expirées (RGPD art. 5.1.e).
--
-- Active pg_cron + pg_net si pas déjà fait, puis programme un job quotidien
-- qui invoque l'Edge Function `purge-expired` à 03h00 UTC.
--
-- Prérequis avant exécution :
--   1. Edge Function `purge-expired` déployée :
--        npx supabase functions deploy purge-expired --project-ref <ref>
--   2. Secret `PURGE_TOKEN` configuré côté Edge Function :
--        npx supabase secrets set PURGE_TOKEN=<random-32-bytes-base64>
--   3. Variables Postgres : remplacer les placeholders ci-dessous par les
--      valeurs réelles avant exécution (project-ref + token).
--
-- Annulation : `SELECT cron.unschedule('purge-expired-applications');`

-- ─── 1. Activer les extensions nécessaires ────────────────────────────────
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- ─── 2. Fonction wrapper qui appelle l'Edge Function avec le token ────────
-- Stockée dans le schéma `private` (à créer si absent) pour éviter qu'elle
-- soit appelée depuis l'API publique PostgREST.
create schema if not exists private;

create or replace function private.invoke_purge_expired()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_ref  text := current_setting('app.settings.project_ref',  true);
  v_purge_token  text := current_setting('app.settings.purge_token',  true);
  v_url          text;
begin
  if v_project_ref is null or v_purge_token is null then
    raise exception 'Settings app.settings.project_ref ou app.settings.purge_token manquants';
  end if;

  v_url := format('https://%s.supabase.co/functions/v1/purge-expired', v_project_ref);

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'X-Purge-Token',  v_purge_token
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

-- ─── 3. Programmer le job quotidien (03h00 UTC) ───────────────────────────
-- Annuler une éventuelle ancienne version puis recréer.
do $$
begin
  perform cron.unschedule('purge-expired-applications');
exception when others then
  -- pas d'ancien job, ignorer
  null;
end;
$$;

select cron.schedule(
  'purge-expired-applications',
  '0 3 * * *',
  $$select private.invoke_purge_expired();$$
);

-- ─── 4. Configuration applicative ─────────────────────────────────────────
-- À exécuter UNE FOIS via l'éditeur SQL Supabase (Dashboard → SQL Editor),
-- en remplaçant les placeholders. NE PAS COMMITTER les valeurs réelles.
--
--   alter database postgres set "app.settings.project_ref" = '<project-ref>';
--   alter database postgres set "app.settings.purge_token" = '<purge-token>';
--
-- Vérifier ensuite :
--   select cron.jobname, cron.schedule, cron.active from cron.job
--   where jobname = 'purge-expired-applications';
