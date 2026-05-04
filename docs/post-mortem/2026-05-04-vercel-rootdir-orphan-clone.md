---
type: post-mortem
title: Builds Preview Vercel cassés à répétition — copie morte du projet à la racine
date: 2026-05-04
incident_start: 2026-05-04T18:35:00Z
incident_end: 2026-05-04T19:20:00Z
duration_minutes: 45
severity: medium
authors: David Jahan
status: finalised
---

# Builds Preview Vercel cassés à répétition

## TL;DR

Activée dans la session, l'intégration Git Vercel échouait systématiquement sur tous les builds Preview avec des erreurs TypeScript pointant un code obsolète (Turnstile, SelectValue, var `ext` non utilisée) qui n'existait pas dans le code source actif. Cause : le projet Vercel avait `rootDirectory = "."` alors que le dépôt contenait à la fois `recrutai/` (code à jour) et une **copie morte** d'une ancienne version dans `src/`, `package.json`, etc. à la racine. Vercel buildait sur la copie morte. Fix : suppression de la copie morte + modification de `rootDirectory` à `recrutai` via API Vercel.

## Chronologie

| Heure (UTC) | Événement | Acteur |
|---|---|---|
| ~18:35 | David active Vercel Git Integration → premier build Preview échoue immédiatement | Vercel |
| ~18:40 | David transmet le log de build : erreurs TS sur Turnstile / SelectValue / ext | David |
| 18:50 | Diagnostic initial faux : suspicion d'un cache `.tsbuildinfo` Vercel pollué | Claude |
| 18:55 | `vercel --prod --yes --force` (CLI, depuis `recrutai/`) → succès. Faux signal : on a cru le cache purgé | Claude |
| 19:00 | Nouveau push → Preview Git Integration toujours en Error avec **les mêmes erreurs TS exactes** | CI |
| 19:08 | Comparaison `git show 9ec5316:recrutai/src/pages/Login.tsx` ↔ Vercel logs : aucun match. Vercel ne lit pas notre code | Claude |
| 19:12 | `vercel project inspect recrutai2-app` révèle `Root Directory : .` | Claude |
| 19:13 | `ls` à la racine du repo → présence de `src/`, `package.json`, `tsconfig.json`, `vite.config.ts`, etc. en doublon de `recrutai/` | Claude |
| 19:14 | `grep "TurnstileInstance" src/pages/Login.tsx` → match. **Cause confirmée**. | Claude |
| 19:15 | Suppression Git de la copie morte (~30 fichiers) + push (`fbbf523`) | Claude |
| 19:18 | Modification `rootDirectory` à `recrutai` via API REST Vercel (PATCH `/v9/projects/...`) | Claude |
| 19:19 | Commit vide + push (`50887d7`) → Preview Vercel Ready en 45 s | Claude |
| 19:20 | Pipeline Git Integration nominal | — |

## Impact

- **Utilisateurs affectés** : 0 — Production fonctionnait via les `vercel --prod` CLI.
- **Données affectées** : aucune.
- **Composants impactés** : pipeline CI/CD Vercel Git Integration (Preview).
- **Engagement contractuel impacté** : aucun (pré-prod).
- **Coût** : ~45 min de boucle de debug + ~15 builds Preview consommés (gratuits, plan Hobby).

## Causes

### Cause directe

Vercel `rootDirectory` à `.` + présence d'une copie morte du projet à la racine du dépôt → Vercel exécutait `tsc -b && vite build` à la racine sur du code obsolète.

### Causes systémiques

1. **Migration `recrutai/` non finalisée** : lors d'une refonte précédente, le code a été déplacé dans `recrutai/` mais les fichiers à la racine n'ont jamais été supprimés. Personne ne s'en est aperçu tant que Vercel n'utilisait pas Git Integration.
2. **Vercel Project Settings non revus** : le projet a été créé quand le code était à la racine, donc `rootDirectory: "."`. La migration logique aurait dû s'accompagner d'un changement de configuration côté Vercel.
3. **Absence de canary** : on n'a pas vérifié qu'un push GitHub déclenchait un build Vercel sain avant d'écrire 30 commits. La première Git Integration test = découverte du bug en production de la branche.
4. **Absence de monitoring du status Vercel Git** : on s'est rendu compte du problème car David a remonté un log, pas via une alerte.
5. **Diagnostic initial trop confiant** : la première hypothèse (cache `.tsbuildinfo`) était plausible mais fausse. Le `--force` du CLI n'a pas confirmé le fix car CLI et Git Integration utilisent des chemins différents (depuis `recrutai/` vs depuis `.`).

## Ce qui a bien marché

- L'utilisateur a remonté immédiatement le log Vercel complet → diagnostic possible.
- La comparaison `git show <commit>:<file>` ↔ logs Vercel a définitivement prouvé l'incohérence.
- Le test `grep "TurnstileInstance" src/`, simple et direct, a révélé la cause en 30 s.
- L'API REST Vercel a permis de modifier `rootDirectory` en CLI sans aller dans le Dashboard.
- Production CLI a continué à marcher pendant tout l'incident.

## Ce qui n'a pas bien marché

- Le diagnostic initial (cache pollué) a fait perdre 15-20 min : on a poussé 2 commits no-op pour tester avant de remettre en cause l'environnement.
- Plusieurs `vercel --prod --yes --force` ont été exécutés en pensant invalider le cache : `--force` ne purge pas le build cache, il évite juste la déduplication des déploiements.
- Le `vercel inspect --logs` n'expose pas clairement le `rootDirectory` utilisé pour le build : il a fallu inspecter le projet pour le voir.

## Actions correctrices

| # | Action | Responsable | Échéance | Statut |
|---|---|---|---|---|
| 1 | Supprimer la copie morte de la racine (`src/`, `package.json`, configs, `tests/`, `public/`, `index.html`, etc.) | Claude | 2026-05-04 | ✅ commit `fbbf523` |
| 2 | Modifier Vercel `rootDirectory` de `.` à `recrutai` | Claude | 2026-05-04 | ✅ via API |
| 3 | Push commit vide pour valider l'auto-deploy Git | Claude | 2026-05-04 | ✅ commit `50887d7`, Preview Ready |
| 4 | Documenter dans CHANGELOG l'incident et le fix | Claude | 2026-05-04 | ✅ |
| 5 | Ajouter un check pré-merge : `[ -f recrutai/package.json ] && [ ! -f package.json ]` (sécurité contre la résurgence du doublon) | David | 2026-05-15 | ⏳ |
| 6 | Mettre en place un canary Vercel : créer une PR de test avec un commit no-op pour valider le pipeline avant la prochaine évolution structurelle | David | au prochain refactor | ⏳ |

## Conformité

- **RGPD** : aucune violation, aucune PII concernée. Aucune notification CNIL nécessaire.
- **RGAA** : pas de régression a11y (le code de la copie morte n'était plus servi en Production avant la session).
- **Engagement client** : aucun, pas de client en prod sur ce périmètre.

## Annexes

- Log build Vercel Preview en échec : `vercel inspect https://recrutai2-1h1y85fxf-jahandavid-6384s-projects.vercel.app --logs`
- Commit cleanup : `fbbf523 chore: supprimer la copie morte du projet à la racine`
- Commit redeploy : `50887d7 ci: trigger Vercel rebuild after rootDirectory=recrutai`
- API Vercel utilisée : `PATCH https://api.vercel.com/v9/projects/prj_nHIVbDK2e1vLRrPvOLtf6z7b8MjO` body `{"rootDirectory":"recrutai"}`
