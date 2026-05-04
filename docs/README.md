# Documentation RecrutAI 2

Index unique de la documentation projet. Chaque type de document est rangé dans son **propre dossier** pour ne jamais mélanger les genres.

## Structure (cadre Diátaxis étendu)

| # | Type | Dossier | À quoi ça sert |
|---|---|---|---|
| **1** | README projet | [`/README.md`](../README.md) | Point d'entrée du dépôt |
| **2** | ADR | [`adr/`](./adr/) | Architecture Decision Record — décisions structurantes datées |
| **3** | Runbook | [`runbook/`](./runbook/) | Procédure d'incident pas-à-pas (« quoi faire si ça pète ») |
| **4** | Post-mortem | [`post-mortem/`](./post-mortem/) | Analyse à froid d'un incident (RETEX) |
| **5** | Changelog | [`/CHANGELOG.md`](../CHANGELOG.md) | Journal des versions et des évolutions |
| **6** | Plan de monitoring | [`monitoring/`](./monitoring/) | Comment savoir « est-ce que ça va ? » |
| **7** | Stratégie d'observabilité | [`observability/`](./observability/) | Comment comprendre « pourquoi ça se comporte comme ça ? » |
| **10a** | Tutoriel | [`tutorials/`](./tutorials/) | Apprendre en faisant (orienté débutant) |
| **10b** | How-to | [`how-to/`](./how-to/) | Résoudre un problème précis (orienté praticien) |
| **10c** | Explication | [`explanation/`](./explanation/) | Comprendre le pourquoi (orienté compréhension) |
| **10d** | Référence | [`reference/`](./reference/) | Chercher une info précise (orienté info) |

> Items 8 et 9 réservés (à venir : SLO/SLI, AIPD complémentaire).

## Règles d'écriture

- **Un document = un quadrant.** Si ça mélange how-to et explication, on coupe en deux et on lie.
- **Frontmatter obligatoire** sur chaque fichier (sauf README) :

  ```yaml
  ---
  type: tutorial | how-to | explanation | reference | adr | runbook | post-mortem
  title: ...
  date: YYYY-MM-DD
  ---
  ```

- **Versionnage avec le code.** Toute modification fonctionnelle qui impacte la doc doit être pushée dans la **même PR** (definition of done conformité).
- **Markdown uniquement** (`.md`), encodage UTF-8, fin de ligne LF. Pas de Word, pas de Notion comme source de vérité.

## Index thématique

### Conformité RGPD / RGAA / RGESN

- [Stratégie de conformité — pipeline CI](./explanation/strategie-conformite.md) (10c)
- [Registre des activités de traitement (art. 30)](./reference/registre-traitements.md) (10d)
- [Déclaration d'accessibilité](./reference/declaration-accessibilite.md) (10d)
- [AIPD — Scoring CV par IA (T01)](./explanation/aipd-scoring-cv.md) (10c)
- [ADR 001 — Migration Anthropic → Mistral](./adr/001-anthropic-vers-mistral.md) (2)

### Procédures RGPD

- [Répondre à une demande d'accès (art. 15 + 20)](./how-to/repondre-demande-acces-rgpd.md)
- [Répondre à une demande d'effacement (art. 17)](./how-to/repondre-demande-effacement-rgpd.md)
- [Traiter une demande d'examen humain (art. 22.3)](./how-to/traiter-demande-examen-humain.md)
- [Notifier une violation de données sous 72 h](./how-to/notifier-violation-72h.md)
- [Onboarder un nouveau sous-traitant (art. 28)](./how-to/onboarder-sous-traitant.md)
- [Activer la purge automatique 2 ans](./how-to/configurer-purge-automatique.md)

### Procédures Accessibilité

- [Auditer un composant avec axe DevTools](./how-to/auditer-composant-axe.md)

### Exploitation

- [Plan de monitoring](./monitoring/) (6)
- [Stratégie d'observabilité](./observability/) (7)
- [Runbooks](./runbook/) (3)
