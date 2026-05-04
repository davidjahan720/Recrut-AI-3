---
type: explanation
title: Stratégie de conformité RGAA / RGPD / RGESN — pipeline CI
date: 2026-05-04
status: accepted
authors: David Jahan
tags: [conformite, ci, rgaa, rgpd, rgesn, a11y, securite]
---

# Stratégie de conformité — pipeline CI

## Contexte

RecrutAI 2 traite des données personnelles candidats sensibles (CVs, identité, parcours) sur le territoire UE et est exposé à un public potentiellement diversifié (recruteurs, candidats, ayants droit). Pour respecter le standard interne « code production-ready, audit RGPD/RGAA AA/RGESN sans remédiation », chaque PR doit passer un pipeline de contrôles automatisés avant merge.

## Décision

Mettre en place un workflow GitHub Actions unique `.github/workflows/conformite.yml` qui exécute en parallèle 7 jobs, dont **6 bloquants** et **1 informatif**.

### Jobs bloquants (`required` pour merge)

| Job | Outil | Critère |
|---|---|---|
| `lint` | ESLint 9 + jsx-a11y | 0 erreur sur règles `error` |
| `typecheck` | `tsc -b --noEmit` | 0 erreur de typage |
| `unit-tests` | Vitest | 100 % des tests passent |
| `build-and-budget` | Vite + script bash | Bundle JS initial ≤ 250 KiB gzippé (RGESN 4.7) |
| `a11y` | Playwright + `@axe-core/playwright` | 0 violation `serious` ou `critical` sur les routes publiques |
| `secrets-scan` | gitleaks | 0 secret détecté |

### Job sur push uniquement (pas PR)

- `lighthouse` — Web Vitals + scores Lighthouse bloquants sur push vers `master` ou `refonte-app`. Désactivé sur PR car nécessite une URL stable déployée (le job tape la prod Vercel).

### Job informatif

- `deps-audit` (`npm audit`) — détecte les CVE high/critical mais ne bloque pas le merge tant qu'on n'a pas de politique de patching opérationnelle.

## Choix de seuils

### RGESN — Budget de bundle

**250 KiB gzip pour le JS initial** = compromis entre :
- repère officiel GreenIT pour une page « moyenne sobre »
- état actuel après lazy-loading des routes (228 KiB observés)
- marge de croissance de ~10 % avant alerte

Si on dépasse, le job échoue avec un message explicite (`::error::Bundle JS initial > 250 KiB`).

### RGAA — Seuil axe-core

axe-core couvre environ **30 % des critères RGAA**. Notre seuil `serious + critical` est **strict** : ces deux niveaux désignent des violations qui empêchent franchement l'accès au contenu (focus invisible, couleur seule comme info, contrôle non labellisé). Les violations `moderate` et `minor` sont loggées mais non bloquantes — elles font l'objet d'un suivi qualité.

Les 70 % de critères non couverts par axe (sens du contenu, alternatives multimédia pertinentes, etc.) doivent être audités manuellement (cf. `docs/how-to/auditer-composant-axe.md` à créer).

### Sécurité — gitleaks

L'action publie un commentaire bloquant sur la PR si elle détecte un pattern de secret (clés API connues, AWS, Supabase, etc.). Le scan porte sur l'historique complet (`fetch-depth: 0`) pour attraper aussi les fuites passées.

## Règles ESLint legacy en `warn`

Le lint contient ~56 warnings hérités du code pré-conformité :

- `@typescript-eslint/no-explicit-any` (35 cas, principalement callbacks Recharts non typés)
- `react-hooks/set-state-in-effect` (8 cas, nouvelle règle React 19 sur les anti-patterns)
- `react-hooks/exhaustive-deps`, `react-hooks/purity`, `no-useless-escape`, `no-unused-expressions`, `react-refresh/only-export-components` (résiduels)

Ces règles relèvent de la **qualité TypeScript / React** et n'impactent ni l'accessibilité, ni la conformité RGPD, ni l'éco-conception. Elles ont été dégradées en `warn` pour ne pas bloquer la CI sur du code legacy. Plan : ouvrir un ticket dédié et les ramener à `error` au fil des PR par fichier.

Les règles **`jsx-a11y/*`** restent en `error`. Elles couvrent les violations RGAA détectables en analyse statique (label associé, alt sur images, role correct, click handler avec keyboard equivalent, etc.).

## Lighthouse CI — seuils retenus (ajout 2026-05-04)

Cible : preset `desktop`, 2 runs par URL pour stabiliser, sur les 5 routes
publiques (`/`, `/login`, `/legal`, `/privacy`, `/accessibilite`).

| Audit | Seuil | Justification |
|---|---|---|
| Performance | ≥ 0.85 | Compromis entre exigence et stabilité du runner GitHub |
| Accessibility | ≥ 0.95 | Cohérent avec l'effort RGAA AA déjà investi |
| Best practices | ≥ 0.90 | Standard sécurité / qualité front |
| SEO | ≥ 0.90 | App SaaS — Landing doit rester indexable |
| LCP | ≤ 2 500 ms | Web Core Vital « bon » |
| CLS | ≤ 0.1 | Web Core Vital « bon » |
| TBT | ≤ 300 ms | Proxy d'INP côté Lighthouse |

Audits désactivés :
- `csp-xss` : la CSP est gérée côté Vercel headers, pas au niveau de la page.
- `is-on-https` : Vercel impose HTTPS, faux positif.
- `redirects-http` : non applicable (Vercel redirige automatiquement).

## Alternatives écartées

- **Lighthouse mobile** : preset desktop choisi pour la stabilité du runner.
  Mobile sera ajouté quand on aura les budgets mobiles définis avec David.
- **EcoIndex CLI** : intéressant mais demande d'héberger un service de mesure. Pour l'instant, le budget de bundle bash en CI suffit.
- **Semgrep / CodeQL** : ajout possible plus tard, pour le moment `npm audit` + `gitleaks` couvrent l'essentiel.

## Conséquences

### Positives
- Toute régression d'accessibilité, de poids, ou de fuite de secret est attrapée avant merge.
- Documentation systématique : la stratégie est lisible par un nouveau contributeur.

### Négatives ou neutres
- Temps CI ajouté : ~3-5 minutes par PR (parallélisable sur runners GitHub).
- Faux positifs possibles sur les règles a11y strictes — on adapte la config au cas par cas (cf. `eslint.config.js`).
- Les tests a11y Playwright ciblent la **prod Vercel** (baseURL configurée). Cela signifie que les violations sont détectées **après** déploiement. À terme, faire tourner les tests sur un build local servi par `vite preview` côté CI pour les détecter avant merge.

## Suivi

- Ouvrir une issue « Cleanup ESLint warnings legacy » pour ramener les règles à `error` progressivement.
- Quand Lighthouse CI sera ajouté : créer ADR 002 et compléter ce document.
- Mesurer le taux de PR rejetées par chaque job pendant le 1er mois — ajuster les seuils si trop bruyants.
