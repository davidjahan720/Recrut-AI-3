# Post-mortem

> **Analyse à froid d'un incident.** Pas pour pointer du doigt — pour ne pas refaire la même erreur.

## Convention

- Un post-mortem par incident significatif (cf. seuils dans [`runbook/`](../runbook/)).
- Nommé `YYYY-MM-DD-slug-court.md`.
- Frontmatter `type: post-mortem`.
- Rédigé **dans la semaine** suivant l'incident, pas plus tard.
- **Blameless** : on cherche les causes systémiques, pas les coupables.

## Template

Repartir de [`_template.md`](./_template.md) à chaque post-mortem.

## Liste des post-mortems

| Date | Incident | Lien |
|---|---|---|
| 2026-05-04 | Builds Preview Vercel cassés à répétition — copie morte du projet à la racine | [post-mortem](./2026-05-04-vercel-rootdir-orphan-clone.md) |

## Quand écrire un post-mortem ?

| Critère | Post-mortem ? |
|---|---|
| Indisponibilité > 30 min affectant les utilisateurs | ✅ obligatoire |
| Violation potentielle de données personnelles | ✅ obligatoire (et notification CNIL si avéré, cf. [`how-to/notifier-violation-72h.md`](../how-to/notifier-violation-72h.md)) |
| Régression a11y serious/critical détectée en prod | ✅ |
| Bug avec impact user mais détecté < 5 min, fix < 15 min | optionnel |
| Demande utilisateur ratée (RGPD délai dépassé, etc.) | ✅ |

## Diffusion

- Le post-mortem est **interne** au cabinet, mais ses **conclusions** peuvent être communiquées au client si l'incident l'a impacté.
- Stocké dans le repo à côté du code → versionné, recherchable, opposable.
