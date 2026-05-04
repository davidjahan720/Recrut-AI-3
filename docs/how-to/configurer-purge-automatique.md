---
type: how-to
title: Activer la purge automatique des candidatures (RGPD art. 5.1.e)
audience: administrateur RecrutAI
duration: 5 minutes
prerequisites:
  - accès admin au projet Supabase (Dashboard + Edge Functions secrets)
  - Supabase CLI installé localement (`npx supabase`)
  - linkage CLI au projet (`npx supabase link --project-ref qdgsansgsiulunynlrch`)
---

# Activer la purge automatique

> Cette procédure rend effective la rétention de **2 ans** annoncée dans le registre des traitements et la politique de confidentialité. Sans elle, RecrutAI 2 est en violation de l'art. 5.1.e RGPD.

## Vue d'ensemble

```
┌──────────┐  03:00 UTC daily   ┌──────────┐  decrypted_secrets  ┌──────────┐  HTTPS POST  ┌──────────────────┐
│ pg_cron  │ ─────────────────▶ │  Vault   │ ──────────────────▶ │  pg_net  │ ───────────▶ │ purge-expired    │
└──────────┘                    └──────────┘                     └──────────┘              └──────────────────┘
                                                                                                    │
                                                                                                    ▼
                                                                                  DELETE applications + Storage > 2 ans
```

## Procédure (5 minutes)

### Étape 1 — Générer + pousser le token

Dans **ton terminal PowerShell** (pour ne pas exposer le token dans le chat) :

```powershell
cd "C:\Users\David\Documents\Cours CDP\Recrut AI 2"

# Génère un token sécurisé (32 octets base64)
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$PURGE_TOKEN = [Convert]::ToBase64String($bytes)

# Pousse dans les secrets de l'Edge Function
"PURGE_TOKEN=$PURGE_TOKEN" | Out-File -Encoding utf8 .secrets.tmp
npx supabase secrets set --env-file .secrets.tmp --project-ref qdgsansgsiulunynlrch
Remove-Item .secrets.tmp

# Affiche le token UNE FOIS pour la suite
Write-Host "TOKEN À COPIER : $PURGE_TOKEN"
```

> **Garde la fenêtre PowerShell ouverte** : tu vas avoir besoin du token pour l'étape 2.

### Étape 2 — Appliquer la migration SQL

1. Ouvrir <https://supabase.com/dashboard/project/qdgsansgsiulunynlrch/sql/new>
2. Copier le contenu intégral de `supabase/migrations/purge_expired_cron.sql`.
3. Dans le SQL Editor, **remplacer `<PURGE_TOKEN>`** (à la ligne `v_token text := '<PURGE_TOKEN>';`) par le token affiché à l'étape 1.
4. Cliquer sur **Run**.

Tu devrais voir s'exécuter sans erreur :
- activation de `pg_cron`, `pg_net` ;
- création du secret `recrutai_purge_token` dans Vault ;
- création de la fonction `private.invoke_purge_expired()` ;
- programmation du job `purge-expired-applications` à 03h00 UTC.

> **Important** : ferme l'onglet une fois le Run réussi pour que le token n'apparaisse plus à l'écran.

### Étape 3 — Vérifier que le job est actif

Toujours dans le SQL Editor :

```sql
select jobname, schedule, active from cron.job
 where jobname = 'purge-expired-applications';
```

Doit retourner :

| jobname | schedule | active |
|---|---|---|
| purge-expired-applications | 0 3 * * * | true |

### Étape 4 — Test manuel (recommandé)

Toujours dans le SQL Editor :

```sql
select private.invoke_purge_expired();
```

L'instruction ne renvoie rien (void) mais déclenche un POST vers l'Edge Function. Vérifier dans le Dashboard Supabase → **Edge Functions** → `purge-expired` → **Logs** que l'invocation apparaît avec un compteur (probablement 0 candidatures supprimées en démo, mais pas d'erreur).

## Vérifier les exécutions ultérieures

Le pg_cron logge ses runs dans la table `cron.job_run_details` :

```sql
select start_time, end_time, status, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'purge-expired-applications')
order by start_time desc
limit 10;
```

Le détail métier (compteurs candidatures supprimées, CVs supprimés) est dans les logs de l'Edge Function : Dashboard → Edge Functions → `purge-expired` → Logs.

## Modifier la rétention pour les tests

Pour tester avec une rétention courte (ex. 1 jour) sans toucher au cron :

```bash
npx supabase secrets set RETENTION_DAYS=1 --project-ref qdgsansgsiulunynlrch
# tester avec : select private.invoke_purge_expired();
# revenir à 2 ans :
npx supabase secrets unset RETENTION_DAYS --project-ref qdgsansgsiulunynlrch
```

## Désactivation / suppression du job

```sql
select cron.unschedule('purge-expired-applications');
```

Pour réactiver, ré-exécuter l'étape 2.

## Sécurité

- Le token est requis pour appeler l'Edge Function — aucune purge possible sans.
- Le token est stocké uniquement chez Supabase (Edge Function secrets + Vault chiffré).
- Le secret n'apparaît jamais dans Git, ni dans la conversation Claude une fois généré dans le terminal.
- L'Edge Function est en HTTPS, TLS 1.3.
- Aucune PII candidat n'est journalisée pendant la purge — seuls les compteurs.
- Les fichiers commençant par `seed/` sont exclus de la purge.

## Documentation associée

- AIPD T01 : `docs/explanation/aipd-scoring-cv.md` (risque R5 « Conservation excessive » couvert par cette procédure).
- Registre des traitements : `docs/reference/registre-traitements.md` (T01 « durée de conservation : 2 ans »).
