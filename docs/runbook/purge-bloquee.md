---
type: runbook
title: Purge automatique bloquée ou en erreur
severity: medium
last_review: 2026-05-04
---

# Purge automatique bloquée

## Symptômes

- La table `applications` croît au-delà de 2 ans sans purge.
- `cron.job_run_details` indique `status='failed'` pour `purge-expired-applications`.
- Edge Function `purge-expired` retourne `errors > 0` ou pas de log récent.

## Diagnostic (3 min)

1. **Job pg_cron actif ?**

   ```sql
   select jobname, schedule, active, command from cron.job
   where jobname = 'purge-expired-applications';
   ```

   `active=true` attendu.

2. **Dernières exécutions**

   ```sql
   select start_time, end_time, status, return_message
   from cron.job_run_details
   where jobid = (select jobid from cron.job where jobname = 'purge-expired-applications')
   order by start_time desc limit 10;
   ```

   - Aucune ligne récente → cron pas déclenché (extension `pg_cron` désactivée ?).
   - `status='failed'` → erreur dans `private.invoke_purge_expired()` ou côté Edge Function.

3. **Vault contient le token ?**

   ```sql
   select name, length(decrypted_secret) as len_token
   from vault.decrypted_secrets where name = 'recrutai_purge_token';
   ```

   Doit retourner 1 ligne, `len_token >= 16`.

4. **Edge Function joignable ?**

   ```powershell
   $h = @{ "X-Purge-Token" = "<token>" }
   Invoke-RestMethod -Uri "https://qdgsansgsiulunynlrch.supabase.co/functions/v1/purge-expired" -Method POST -Body '{}' -ContentType "application/json" -Headers $h
   ```

   Attendu : JSON `{ "deleted_applications": ..., "errors": 0 }`.

## Actions correctrices

### Cas A — Cron désactivé

```sql
update cron.job set active = true where jobname = 'purge-expired-applications';
```

### Cas B — Token Vault perdu / invalide

1. Régénérer le token (cf. [how-to/configurer-purge-automatique.md](../how-to/configurer-purge-automatique.md)).
2. Mettre à jour Vault :

   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'recrutai_purge_token'),
     '<nouveau_token>'
   );
   ```

3. Mettre à jour les secrets Edge Function (`PURGE_TOKEN`).

### Cas C — Edge Function non déployée

```bash
npx supabase functions deploy purge-expired --no-verify-jwt --project-ref qdgsansgsiulunynlrch
```

### Cas D — Erreurs côté Storage (CVs pas supprimés)

Voir les logs de l'Edge Function : `Dashboard → Edge Functions → purge-expired → Logs`. Souvent un problème de RLS / service-role key.

```bash
npx supabase secrets list --project-ref qdgsansgsiulunynlrch | grep SERVICE_ROLE
```

## Vérification de retour à la normale

```sql
-- Test manuel
select private.invoke_purge_expired();

-- Vérifier l'état
select start_time, status from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'purge-expired-applications')
order by start_time desc limit 1;
```

## Quand ouvrir un post-mortem

- Si la table contient des candidatures > 2 ans qui auraient dû être supprimées → **violation potentielle art. 5.1.e RGPD**, post-mortem obligatoire et notification CNIL si l'écart est significatif (> 1 mois).
- Si une chaîne de Vault → secret → Edge Function s'est cassée silencieusement pendant > 30 jours.
