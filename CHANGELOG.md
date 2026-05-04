# Changelog — RecrutAI 2

Toutes les modifications notables sont consignées ici. Le format suit
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et la numérotation
respecte [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### À venir
- Configuration `RESEND_API_KEY` côté Vercel pour les emails DPO
- ESLint cleanup des warnings legacy (~58)
- Audit lecteur d'écran (NVDA/VoiceOver) sur le golden path
- Branch protection GitHub + Vercel Git Integration

---

## [v3.0.0-conformite] — 2026-05-04

> Refonte massive **RGPD / RGAA AA / RGESN** : passe RecrutAI 2 d'un MVP fonctionnel à un service défendable en audit CNIL. Prochain tag à créer après validation production.

### Ajouté

#### RGPD
- Endpoints **art. 15-17** unifiés sous `/api/rgpd` : export (JSON portable + URLs CV signées 1 h), rectification, effacement avec confirmation. Auth par header `X-Actor`, journal anonymisé (hash SHA-256).
- Endpoint **art. 22.3** (droit à un examen humain) : page publique `/contestation`, notification DPO via Resend (best effort), bandeau dédié dans l'email envoyé au client final lors d'une qualification.
- **Purge automatique RGPD art. 5.1.e** : Edge Function `purge-expired` (Deno), déclenchement quotidien 03 h 00 UTC via `pg_cron` + `pg_net`, secret stocké dans Supabase Vault, exclusion des `seed/`, batches de 500.
- **Registre des traitements** (art. 30) : 5 traitements documentés (T01 IA, T02 CRM, T03 auth, T04 emails, T05 journal) — `docs/reference/registre-traitements.md`.
- **AIPD T01 scoring CV** (art. 35) : 6 risques R1–R6 identifiés, mesures couvertes — `docs/explanation/aipd-scoring-cv.md`.
- **5 how-to RGPD critiques** (`docs/how-to/`) : accès, effacement, examen humain, violation 72 h, onboarding sous-traitant, purge automatique.
- **Migration sous-traitant IA** Anthropic Claude (US) → **Mistral AI** (France, UE) — ADR 001.
- **Pages publiques** : Mentions légales `/legal`, Politique de confidentialité `/privacy`, Déclaration d'accessibilité `/accessibilite`, Examen humain `/contestation`.

#### RGAA AA
- Refonte de **toutes les pages** (publiques et internes) : skip link, sémantique HTML5, hiérarchie h1/h2/h3, `<caption>` sr-only, `scope` sur tableaux, `role="progressbar"`, `aria-expanded`/`aria-controls`/`aria-pressed`, focus visible.
- **Tests axe-core en CI** : 13 routes auditées (6 publiques + 7 privées), 0 violation `serious`/`critical`.
- **ESLint** plugin `jsx-a11y` activé en `error` (règles legacy en `warn`).
- **Déclaration d'accessibilité** publique selon gabarit DINUM, voies de recours Défenseur des droits.
- **`prefers-reduced-motion`** respecté globalement.
- **ScoreBadge / StatusBadge** : information non portée par la couleur seule.

#### RGESN
- **Code-splitting** des routes applicatives (React.lazy) : bundle initial **228 KiB gzip** (était 1108 KiB).
- **Polices** : 2 graisses Inter (au lieu de 4).
- **Dépendance `@anthropic-ai/sdk` retirée** (~250 ko), remplacée par `fetch` natif.
- **Lighthouse CI** bloquant en CI sur 5 routes publiques (Performance ≥ 0.85, A11y ≥ 0.95, BP ≥ 0.9, SEO ≥ 0.9, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 300 ms).
- **Budget bundle** ≤ 250 KiB gzip vérifié en CI.

#### CI/CD
- **Workflow `.github/workflows/conformite.yml`** : 7 jobs bloquants + 1 informatif (lint, typecheck, unit-tests, build+budget, a11y axe-core, Lighthouse CI, gitleaks, npm audit).
- **Tests Playwright** : `tests/a11y/public-routes.spec.ts` et `tests/a11y/private-routes.spec.ts`.

#### Documentation
- Structure **Diátaxis étendue** (cf. `docs/README.md`) : ADR, Runbook, Post-mortem, Plan de monitoring, Stratégie d'observabilité, Tutorial, How-to, Explanation, Reference.

### Modifié
- `Legal.tsx` mutualise `/legal`, `/privacy`, `/accessibilite` (3 modes, ~7 sections chacun).
- API de suppression consolidée : `/api/delete-{application,client,job}` → `/api/delete` avec champ `entity` (limite Vercel Hobby 12 fonctions).
- `parseClaudeResponse.ts` renommé `parseAiResponse.ts` (agnostique du fournisseur).
- Email Resend client : destinataire désormais `clients.notification_email` (réparation d'un bug RGPD : avant codé en dur sur un email personnel).
- `lang="fr"` sur `<html>`, meta description, title explicite.

### Sécurité
- **Hash SHA-256 tronqué** des emails dans tous les logs RGPD (jamais de PII en clair).
- **gitleaks** intégré au pipeline CI (scan complet de l'historique).
- Edge Function `purge-expired` déployée avec `--no-verify-jwt` mais protégée par `X-Purge-Token` (Vault Supabase).
- `Mistral OCR` accepté en TLS 1.3, hébergement UE.

### Supprimé
- Dépendance `@anthropic-ai/sdk`.
- Pages internes obsolètes (`AccountManagerDashboard.tsx`, `ManagerPersonalDashboard.tsx`).
- Endpoints `/api/delete-application`, `/api/delete-client`, `/api/delete-job` (consolidés en `/api/delete`).
- Email personnel codé en dur dans le destinataire des notifications (bug RGPD).

---

## [v2.0.0] — 2026-04-19

Refonte v2 (avant cette session) : responsive, uploads en arrière-plan, palette harmonisée, accessibilité partielle, déduplication CV serveur, switch profils sans mot de passe.

(Voir le tag git `v2.0` pour le détail.)

---

## [v1.0.0] — précédent

Version initiale stable de RecrutAI (tag `v1.0`, branche `master`).

---

[Unreleased]: https://github.com/davidjahan720/Recrut-AI-3/compare/v2.0...HEAD
[v3.0.0-conformite]: https://github.com/davidjahan720/Recrut-AI-3/compare/v2.0...refonte-app
[v2.0.0]: https://github.com/davidjahan720/Recrut-AI-3/releases/tag/v2.0
[v1.0.0]: https://github.com/davidjahan720/Recrut-AI-3/releases/tag/v1.0
