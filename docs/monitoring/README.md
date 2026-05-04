---
type: reference
title: Plan de monitoring — RecrutAI 2
date: 2026-05-04
version: 1.0
---

# Plan de monitoring

> Réponse à la question : **« est-ce que ça va, là, en ce moment ? »**.
> À distinguer de l'observabilité (« pourquoi ça se comporte comme ça ? ») dans [`/docs/observability/`](../observability/).

## Objectifs métier (SLO indicatifs — à formaliser)

| Service | SLO cible | Mesure |
|---|---|---|
| Plateforme web | 99,5 % de disponibilité mensuelle | Vercel Status + health check externe |
| Analyse CV (Mistral) | 95 % des CVs scorés en < 60 s | `applications.created_at` → `applications.updated_at` p95 |
| Notification email client | 98 % des emails envoyés en < 5 min après qualification | `email_sent_at` − `created_at` p95 |
| Demandes RGPD (export/erase/rectify) | 100 % de réponses < 200 ms côté API | Vercel logs |
| Purge automatique | 100 % des candidatures > 2 ans purgées sous 24 h | `select count(*) from applications where created_at < now() - interval '2 years' and cv_file_path not like 'seed/%'` doit retourner 0 |

## Sources de signal

| Source | Couvre | Accès |
|---|---|---|
| **Vercel** Functions logs | API serverless `/api/*`, build, déploiements | Dashboard Vercel ou `vercel logs` |
| **Vercel** Web Analytics | trafic Landing, conversions | Dashboard Vercel |
| **Sentry** | erreurs JS front + back, traces | recrutai-app, deja configuré (`@sentry/react`) |
| **Supabase** Logs | DB, Auth, Storage, Edge Functions | Dashboard Supabase → Logs |
| **Supabase** `cron.job_run_details` | exécutions de la purge automatique | SQL |
| **Supabase** `vault.decrypted_secrets` | présence des secrets de purge | SQL |
| **GitHub Actions** | pipeline conformité (lint, typecheck, tests, a11y, Lighthouse, secrets-scan) | <https://github.com/davidjahan720/Recrut-AI-3/actions> |
| **Mistral Console** | quota, facturation, status | <https://console.mistral.ai>, <https://status.mistral.ai> |
| **Brevo** | délivrabilité email DPO + clients | Dashboard Brevo |

## Alertes (à configurer)

| Sévérité | Trigger | Canal | Délai max d'action |
|---|---|---|---|
| **Critical** | Vercel deployment failed sur `master` | Email + ouvrir un runbook | 30 min |
| **Critical** | Sentry : > 10 erreurs `Mistral chat HTTP 5xx` en 5 min | Email | 30 min |
| **High** | `cron.job_run_details` purge en `failed` 2 jours d'affilée | Email hebdo | 24 h |
| **High** | Lighthouse score Performance < 0.85 sur Landing | Notification GitHub Actions | 48 h |
| **Medium** | a11y axe-core trouve une violation `serious` en CI | Notification PR | dans la PR |
| **Medium** | gitleaks détecte un secret commité | Bloque le merge | dans la PR |
| **Low** | Quota Mistral à > 80 % du plafond mensuel | Email mensuel | 1 sem. |

> Aujourd'hui, la plupart des alertes sont **passives** (email, dashboard) — pas de pageur. Pour un service à plus fort enjeu, ajouter un pager (PagerDuty, Opsgenie).

## Health checks externes (à mettre en place)

À planifier sur un service externe gratuit (UptimeRobot, BetterUptime, Hyperping) :

1. `GET https://recrutai2-app.vercel.app/` — Landing renvoie 200, contient « RecrutAI »
2. `POST https://recrutai2-app.vercel.app/api/parse-job` avec `{}` — renvoie 400 « pdf_base64 manquant » (= API serveur réactive, pas crashée)
3. `POST https://recrutai2-app.vercel.app/api/rgpd` avec `{"action":"unknown"}` — renvoie 400

Fréquence : 5 min, alerte après 3 échecs consécutifs.

## Dashboards à construire (TODO)

- **Tableau de bord exploitation** : statut Mistral, Vercel, Supabase + dernière run CI + nombre de candidatures pending depuis > 5 min.
- **Tableau de bord conformité RGPD** : nombre de demandes art. 15-17-22.3 reçues / traitées sur 30 j ; date de dernière purge ; nombre de candidatures > 2 ans en base.

## Revue mensuelle

Le 1er de chaque mois :
- Revoir les SLO atteints sur le mois écoulé.
- Lister les incidents (post-mortems) du mois.
- Mettre à jour ce plan si nécessaire.
- Vérifier que les runbooks sont à jour (date `last_review` < 6 mois).
