---
type: how-to
title: Activer la purge automatique des candidatures (RGPD art. 5.1.e)
audience: administrateur RecrutAI
duration: 15 minutes
prerequisites:
  - accès admin au projet Supabase (Dashboard + Edge Functions secrets)
  - Supabase CLI installé localement (`npx supabase`)
  - linkage CLI au projet (`npx supabase link --project-ref <ref>`)
---

# Activer la purge automatique

> Cette procédure rend effective la rétention de **2 ans** annoncée dans le registre des traitements et la politique de confidentialité. Sans elle, RecrutAI 2 est en violation de l'art. 5.1.e RGPD.

## Vue d'ensemble

```
┌────────────────┐  03:00 UTC daily  ┌──────────────┐  HTTP POST  ┌──────────────────┐
│  pg_cron       │ ────────────────▶ │ pg_net       │ ──────────▶ │ Edge Function    │
│  (Postgres)    │                   │ (HTTP client)│             │ purge-expired    │
└────────────────┘                   └──────────────┘             └──────────────────┘
                                                                          │
                                                                          ▼
                                                            DELETE applications + Storage
```

## Étape 1 — Déployer l'Edge Function

```bash
cd "C:\Users\David\Documents\Cours CDP\Recrut AI 2"
npx supabase functions deploy purge-expired --project-ref qdgsansgsiulunynlrch
```

Vérifier dans le Dashboard Supabase → Edge Functions → `purge-expired` qu'elle apparaît.

## Étape 2 — Configurer le token de sécurité

Générer un token aléatoire (32 octets base64) et le pousser comme secret :

```powershell
# PowerShell
$token = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
Write-Host $token
```

ou en bash :

```bash
openssl rand -base64 32
```

Pousser le token côté Edge Function :

```bash
npx supabase secrets set PURGE_TOKEN=<le-token-généré> --project-ref qdgsansgsiulunynlrch
```

**[ACTION] : conserver ce token en lieu sûr (gestionnaire de secrets) — il sera demandé à l'étape 3.**

## Étape 3 — Configurer pg_cron + pg_net

### 3a. Appliquer la migration SQL

Dans le Dashboard Supabase → SQL Editor → New query, coller le contenu de `supabase/migrations/purge_expired_cron.sql` puis exécuter.

Cela :
- active les extensions `pg_cron` et `pg_net` ;
- crée la fonction `private.invoke_purge_expired()` ;
- programme le cron `purge-expired-applications` à 03h00 UTC chaque jour.

### 3b. Renseigner les paramètres applicatifs

Toujours dans SQL Editor, exécuter (en remplaçant les valeurs) :

```sql
alter database postgres set "app.settings.project_ref" = 'qdgsansgsiulunynlrch';
alter database postgres set "app.settings.purge_token" = '<le-token-généré-étape-2>';
```

> **Important** : ces deux `alter database` ne sont **pas** versionnés en Git pour ne pas exposer le token. Conserver une note dans votre coffre-fort indiquant qu'ils ont été appliqués sur ce projet.

## Étape 4 — Vérifier que le job est actif

Dans SQL Editor :

```sql
select jobname, schedule, active, command
from cron.job
where jobname = 'purge-expired-applications';
```

Vous devriez voir :

| jobname | schedule | active | command |
|---|---|---|---|
| purge-expired-applications | 0 3 * * * | true | select private.invoke_purge_expired(); |

## Étape 5 — Test manuel (recommandé avant production)

Pour tester sans attendre minuit, déclencher manuellement la purge :

```bash
curl -X POST "https://qdgsansgsiulunynlrch.supabase.co/functions/v1/purge-expired" \
  -H "X-Purge-Token: <le-token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Réponse attendue :

```json
{
  "started_at": "2026-05-04T...",
  "finished_at": "2026-05-04T...",
  "retention_days": 730,
  "cutoff_date": "2024-05-04T...",
  "deleted_applications": 0,
  "deleted_cvs": 0,
  "errors": 0
}
```

Sur une base avec des candidatures > 2 ans, vous verrez les compteurs augmenter.

## Étape 6 — Vérifier les exécutions ultérieures

Le pg_cron logge ses runs dans la table `cron.job_run_details` :

```sql
select start_time, end_time, status, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'purge-expired-applications')
order by start_time desc
limit 10;
```

Le détail de la purge (compteurs) est dans les logs de l'Edge Function : Dashboard → Edge Functions → `purge-expired` → Logs.

## Modifier la rétention pour les tests

Pour tester avec une rétention courte (ex. 1 jour), pousser une variable temporaire :

```bash
npx supabase secrets set RETENTION_DAYS=1 --project-ref qdgsansgsiulunynlrch
# ... tester ...
# Revenir à la valeur par défaut (suppression du secret) :
npx supabase secrets unset RETENTION_DAYS --project-ref qdgsansgsiulunynlrch
```

## Désactivation / suppression du job

Si nécessaire (maintenance, incident) :

```sql
select cron.unschedule('purge-expired-applications');
```

Pour réactiver, ré-exécuter l'étape 3.

## Sécurité

- Le token est requis pour appeler l'Edge Function — aucune purge n'est possible sans.
- Le secret est stocké uniquement chez Supabase (jamais dans Git).
- L'Edge Function est en HTTPS, TLS 1.3.
- Aucune PII candidat n'est journalisée pendant la purge — seuls les compteurs (nombre de rows / fichiers supprimés).
- Les fichiers commençant par `seed/` sont **exclus** de la purge (données de démo).

## Documentation associée

- AIPD T01 : `docs/explanation/aipd-scoring-cv.md` — risque R5 « Conservation excessive » couvert par cette procédure.
- Registre des traitements : `docs/reference/registre-traitements.md` — T01 « durée de conservation : 2 ans ».
