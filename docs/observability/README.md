---
type: explanation
title: Stratégie d'observabilité — RecrutAI 2
date: 2026-05-04
version: 1.0
---

# Stratégie d'observabilité

> Réponse à la question : **« pourquoi ça se comporte comme ça ? »**.
> À distinguer du monitoring (« est-ce que ça va ? ») dans [`/docs/monitoring/`](../monitoring/).

## Trois piliers

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    LOGS     │    │   TRACES    │    │  MÉTRIQUES  │
│ "ce qui     │    │ "le chemin  │    │ "les chiffres│
│  s'est      │    │  d'une      │    │  agrégés"    │
│  passé"     │    │  requête"   │    │              │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Logs

### Principes

- **Format JSON** structuré pour qu'un outil puisse les parser (jq, Logflare, etc.).
- **Niveaux** : `debug` (jamais en prod), `info` (événements normaux), `warn` (anomalie sans impact), `error` (impact utilisateur).
- **Aucune PII** : pas d'email candidat, pas de contenu de CV, pas de nom client. Hash SHA-256 tronqué (16 hex) pour identifier sans exposer.
- **Cardinalité** : éviter de logger sur boucle ou par row d'une table (10 lignes par invocation max).
- **Rétention** : 12 mois max (cf. T05 du registre des traitements).

### Implémentation actuelle

| Source | Format | Couvre |
|---|---|---|
| **`/api/rgpd`** action `*` | `{type:"rgpd_action", actor, target_hash, action, result, detail}` | Audit RGPD art. 30 |
| **`/api/rgpd`** action `request-review` | `{type:"rgpd_review_request", target_hash, requester_hash, motivation_chars, email_sent}` | Audit art. 22.3 |
| **`purge-expired`** Edge Function | `{type:"rgpd_purge", started_at, finished_at, retention_days, deleted_applications, deleted_cvs, errors}` | Audit art. 5.1.e |
| **`score-cv`** Edge Function | `console.error('Mistral chat HTTP X')` (sans payload) | Erreurs IA |
| **Front (Sentry)** | breadcrumbs + erreurs JS | Erreurs UX |

### Recherche de logs

```bash
# Vercel functions
vercel logs <deployment> --output json | jq 'select(.type=="rgpd_action")'

# Supabase Edge Functions
# → Dashboard → Edge Functions → <fn> → Logs (filtre JSON natif)
```

## Traces

### État actuel

- **Sentry Performance** est installé côté front (`@sentry/react`) — collecte automatique des transactions navigateur + breadcrumbs.
- Pas de traçage distribué côté backend (Vercel Functions ne propagent pas de `traceparent` aujourd'hui).

### Cible

- Activer **OpenTelemetry** côté Vercel Functions (`@vercel/otel`) quand on aura un traffic justifiant la facture export OTLP.
- Continuité du `traceparent` : front Sentry → API Vercel → Edge Function Supabase → Mistral. Pour l'instant, hors scope MVP.

## Métriques

### Métriques techniques (auto-collectées)

| Métrique | Source | Usage |
|---|---|---|
| `web_vitals.lcp`, `cls`, `inp` | Sentry / Web Vitals | Détection régression perf |
| Taux d'erreur `/api/*` | Vercel Analytics | Alerting |
| Durée de fonction (p50, p95, p99) | Vercel Functions logs | Capacity planning |
| Nombre d'invocations Edge Functions | Supabase Dashboard | Quota / facturation |

### Métriques métier (à instrumenter)

À calculer en SQL ou via dashboard Supabase :

```sql
-- Taux de qualification par jour
select date_trunc('day', created_at) as d,
       count(*) filter (where status = 'qualified') as qualified,
       count(*) filter (where status = 'rejected')  as rejected,
       count(*) filter (where status = 'error')     as errors,
       count(*)                                     as total
from applications
where created_at > now() - interval '30 days'
group by 1 order by 1 desc;

-- Distribution des scores (si pertinent pour audit biais)
select width_bucket(score, 0, 100, 10) * 10 as score_bucket, count(*)
from applications where score is not null and created_at > now() - interval '30 days'
group by 1 order by 1;

-- Latence p95 du scoring (si on capture updated_at - created_at)
-- TODO : ajouter une colonne scored_at pour mesure précise
```

## Cohérence avec le RGPD

- **Pas de PII en logs** : règle absolue. Toute violation → erreur de code à corriger ASAP.
- **Logs anonymisés conservés 12 mois** ; au-delà, Vercel les purge automatiquement (rétention plan Hobby).
- **Logs métier** stockés en base (`applications`, futurs `purge_runs`) sont soumis aux mêmes règles de rétention que les données candidat.

## Roadmap observabilité

| Priorité | Item | Pourquoi |
|---|---|---|
| Court terme | Health checks externes | Détecter une indispo prod sans dépendre de Vercel |
| Court terme | Dashboard Supabase « purge automatique » | Visualiser que le RGPD art. 5.1.e est respecté |
| Moyen terme | OpenTelemetry sur Vercel Functions + Mistral | Traces distribuées pour debug latence |
| Moyen terme | Dashboard biais IA (distribution scores par segment) | Auditer R1 de l'AIPD |
| Long terme | SLO/SLI formalisés + budget d'erreur | Dialogue produit-tech objectivé |
