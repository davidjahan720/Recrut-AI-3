-- Migration : planifie la purge automatique des candidatures expirées (RGPD art. 5.1.e).
--
-- Active pg_cron + pg_net + supabase_vault, stocke le token de la purge
-- dans Vault (chiffré), puis programme un job quotidien qui appelle
-- l'Edge Function `purge-expired` à 03h00 UTC.
--
-- Prérequis avant exécution :
--   1. Edge Function `purge-expired` déployée (faite automatiquement par
--      le script PowerShell d'activation).
--   2. Token PURGE_TOKEN poussé dans les secrets de l'Edge Function.
--   3. Le même token sera passé en paramètre du `vault.create_secret()`
--      ci-dessous (remplacer le placeholder).

-- ─── 1. Activer les extensions nécessaires ────────────────────────────────
create extension if not exists pg_cron        with schema extensions;
create extension if not exists pg_net         with schema extensions;
-- supabase_vault est déjà installée par défaut sur tout projet Supabase.

-- ─── 2. Stocker le token dans Vault (chiffré) ─────────────────────────────
-- IMPORTANT : remplacer <PURGE_TOKEN> par la valeur réelle avant d'exécuter.
-- Si un secret 'recrutai_purge_token' existe déjà, on l'écrase via update_secret.
do $$
declare
  v_token text := '<PURGE_TOKEN>';
  v_existing_id uuid;
begin
  if v_token = '<' || 'PURGE_TOKEN' || '>' or v_token is null or length(v_token) < 16 then
    raise exception 'Remplacer <PURGE_TOKEN> par un token réel d''au moins 16 caractères avant d''exécuter cette migration.';
  end if;

  select id into v_existing_id from vault.secrets where name = 'recrutai_purge_token';
  if v_existing_id is null then
    perform vault.create_secret(v_token, 'recrutai_purge_token', 'Token utilisé par pg_cron pour invoquer l''Edge Function purge-expired');
  else
    perform vault.update_secret(v_existing_id, v_token);
  end if;
end;
$$;

-- ─── 3. Schéma privé pour la fonction wrapper ─────────────────────────────
create schema if not exists private;

-- ─── 4. Fonction wrapper (lit le token depuis Vault, appelle l'Edge Function)
create or replace function private.invoke_purge_expired()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token  text;
  v_url    text := 'https://qdgsansgsiulunynlrch.supabase.co/functions/v1/purge-expired';
begin
  select decrypted_secret
    into v_token
    from vault.decrypted_secrets
   where name = 'recrutai_purge_token'
   limit 1;

  if v_token is null then
    raise exception 'Vault secret recrutai_purge_token introuvable';
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'X-Purge-Token', v_token
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

-- ─── 5. Programmer le job quotidien (03h00 UTC) ───────────────────────────
do $$
begin
  perform cron.unschedule('purge-expired-applications');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'purge-expired-applications',
  '0 3 * * *',
  $$select private.invoke_purge_expired();$$
);

-- ─── 6. Vérification ──────────────────────────────────────────────────────
-- Pour confirmer que tout est en place :
--
--   select jobname, schedule, active from cron.job where jobname = 'purge-expired-applications';
--
-- Pour tester manuellement (sans attendre 03h00) :
--
--   select private.invoke_purge_expired();
--
-- Logs des runs cron :
--
--   select start_time, status, return_message
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'purge-expired-applications')
--   order by start_time desc limit 5;
