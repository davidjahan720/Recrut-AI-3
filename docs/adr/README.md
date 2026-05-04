# Architecture Decision Records (ADR)

> **Décisions structurantes datées et immuables.** Ce qui a été décidé, avec le contexte, les alternatives, et les conséquences.

## Convention

- Un fichier par décision, nommé `NNN-slug-court.md` (numérotation incrémentale).
- Frontmatter Diátaxis `type: explanation` (ou `type: adr` si vous préférez).
- Statut `proposed` → `accepted` → éventuellement `superseded` (jamais supprimé, on ajoute un nouveau ADR qui supersede).
- **Ne jamais réécrire un ADR accepté.** Si la décision change, on crée un nouveau ADR qui pointe vers l'ancien.

## Liste

| # | Date | Titre | Statut |
|---|---|---|---|
| [001](./001-anthropic-vers-mistral.md) | 2026-05-04 | Migration Anthropic Claude → Mistral AI (UE-hosted) | accepted |

## Quand écrire un ADR ?

- Choix de fournisseur cloud / IA / SaaS
- Stratégie d'authentification, d'autorisation
- Modèle de données structurant
- Migrations BDD irréversibles
- Choix d'architecture (monolithe vs services, SSR vs CSR, etc.)
- Stratégie de conformité (RGPD, RGAA, sécurité)

## Quand pas d'ADR ?

- Choix d'une bibliothèque mineure (un ADR pour `eslint-plugin-jsx-a11y`, non — ça vit dans le `package.json` et le commit message)
- Refactoring localisé sans impact architectural
- Bug fix
