---
type: post-mortem
title: "<titre court de l'incident>"
date: YYYY-MM-DD
incident_start: YYYY-MM-DDTHH:MM:SSZ
incident_end: YYYY-MM-DDTHH:MM:SSZ
duration_minutes: 0
severity: low | medium | high | critical
authors: <noms>
status: draft | reviewed | finalised
---

# <Titre incident>

## TL;DR

(2-3 phrases : ce qui s'est passé, ce qui a été touché, comment on a corrigé.)

## Chronologie

| Heure (UTC) | Événement | Acteur |
|---|---|---|
| HH:MM | Détection (alerte / signalement) | |
| HH:MM | Confirmation | |
| HH:MM | Mitigation | |
| HH:MM | Résolution | |

## Impact

- **Utilisateurs affectés** : <nombre estimé / catégorie>
- **Données affectées** : <PII candidat ? client ? volume ?>
- **Composants impactés** : <Vercel / Supabase / Mistral / front / etc.>
- **Engagement contractuel impacté** : <SLA, durée, etc.>

## Causes

### Cause directe

(L'événement immédiat — un déploiement raté, un quota dépassé, etc.)

### Causes systémiques

(Ce qui dans notre process / archi a permis à la cause directe d'avoir cet impact. C'est ici qu'on apprend.)

- Manque de monitoring sur X
- Pas d'alertes sur Y
- Lacune dans le runbook Z
- Couverture de tests insuffisante sur W

## Ce qui a bien marché

- (Détection rapide, runbook efficace, communication, etc.)

## Ce qui n'a pas bien marché

- (Délai d'intervention, runbook obsolète, alerte manquante, etc.)

## Actions correctrices

| # | Action | Responsable | Échéance | Statut |
|---|---|---|---|---|
| 1 | | | | |

## Conformité

- **RGPD** : violation de données ? notification CNIL nécessaire ? (Si oui : référencer la déclaration art. 33 dans `docs/incidents/`.)
- **RGAA** : régression a11y ? mise à jour de la déclaration d'accessibilité ?
- **Engagement client** : ce qui a été dit aux clients ?

## Annexes

- Lien vers les logs (Sentry / Vercel)
- Capture(s) d'écran si pertinent
- Lien vers les PR de mitigation et de fond
