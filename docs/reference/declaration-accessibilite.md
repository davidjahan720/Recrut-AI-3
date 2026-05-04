---
type: reference
title: Déclaration d'accessibilité — RecrutAI 2
date: 2026-05-04
version: 1.0
referentiel: RGAA 4.1
niveau_vise: AA
url_audite: https://recrutai2-app.vercel.app
contact_a11y: contact@recrutai.fr
---

# Déclaration d'accessibilité

> Modèle aligné sur le gabarit officiel publié par la Direction interministérielle du numérique : <https://accessibilite.numerique.gouv.fr/ressources/declaration/>.

RecrutAI s'engage à rendre son service accessible conformément à l'article 47 de la loi n° 2005-102 du 11 février 2005, modifiée par la loi n° 2016-1321 du 7 octobre 2016 pour une République numérique.

À cette fin, nous mettons en œuvre la stratégie et les actions suivantes :
[stratégie pluriannuelle d'accessibilité — à compléter quand formalisée].

Cette déclaration d'accessibilité s'applique à : **<https://recrutai2-app.vercel.app>**.

## État de conformité

**RecrutAI 2 est en conformité partielle avec le RGAA 4.1 niveau AA**, en raison des non-conformités et des dérogations énumérées ci-dessous.

## Résultats des tests

L'audit de conformité réalisé en interne par David Jahan révèle que :
- **30 %** environ des critères du RGAA sont couverts automatiquement par axe-core (jobs CI Playwright + axe sur les routes publiques `/`, `/login`, `/legal`, `/privacy`).
- Les **70 %** restants nécessitent un audit manuel — non encore réalisé de manière exhaustive (cf. dérogations).

À la date de la dernière run CI (2026-05-04), **aucune violation de niveau « serious » ou « critical »** n'est détectée par axe-core sur les routes publiques.

Pour les routes authentifiées (espace recruteur, dashboard manager, gestion clients/offres, candidatures, RGPD), l'audit complet est planifié sur le prochain trimestre.

## Contenus non accessibles

### Non-conformités

À la date de cette déclaration, les éléments suivants ne sont pas conformes :

| Référence | Élément | Critère RGAA | Statut |
|---|---|---|---|
| NC-001 | Graphique Recharts (CA mensuel par chargé) sur `/manager` | 1.7 — Alternative pour images texte / informations complexes | Tableau de données équivalent fourni en `sr-only`. À tester avec lecteur d'écran. |
| NC-002 | Composants shadcn/ui custom (Dialog, Select, Combobox) | 7.1 — Scripts compatibles avec les technologies d'assistance | shadcn s'appuie sur Radix UI, conforme WAI-ARIA mais non vérifié systématiquement |
| NC-003 | Couleurs des badges secondaires (En pause / clôturée) sur fond clair | 3.2 — Contraste suffisant | Contraste légèrement < 4.5:1 sur certains composants legacy |
| NC-004 | Pages internes authentifiées (Manager, Recruiter, Applications, Jobs, Clients, JobDetail, Rgpd) | Ensemble | Audit axe-core automatique non encore exécuté sur ces routes (auth requise) |

### Dérogations

Aucune dérogation pour charge disproportionnée à ce jour.

### Contenus non soumis à l'obligation d'accessibilité

- Les CVs téléversés par les recruteurs (PDFs / Word / images) sont des contenus tiers ; nous ne maîtrisons pas leur accessibilité native. Une description textuelle est cependant générée par l'IA (mistral-ocr-latest) pour permettre la lecture par les technologies d'assistance.
- Les emails transactionnels HTML envoyés aux clients sont conçus avec un balisage accessible (table layout, contraste, alt) mais ne font pas partie de la portée de la présente déclaration.

## Établissement de cette déclaration d'accessibilité

Cette déclaration a été établie le **4 mai 2026**.

### Technologies utilisées pour la réalisation du service

- HTML5 sémantique
- WAI-ARIA 1.2
- CSS3 (Tailwind CSS 3.4)
- JavaScript / TypeScript (React 19, ECMAScript 2020)

### Environnement de test

Les vérifications de restitution des contenus ont été effectuées sur la base de la combinaison fournie par la base de référence du RGAA 4.1, avec les versions suivantes :

| Outil | Version | Plateforme |
|---|---|---|
| Chromium (via Playwright CI) | latest | Linux (GitHub Actions) |
| axe-core | 4.11 | via `@axe-core/playwright` |
| ESLint plugin jsx-a11y | 6.10.2 | analyse statique |

### Outils utilisés pour l'évaluation

- **axe DevTools** (extension navigateur) — audit ponctuel manuel ;
- **`@axe-core/playwright`** — automatisation en CI (job `a11y` du workflow `Conformité`) ;
- **ESLint + plugin `jsx-a11y`** — détection statique au lint.

### Pages du site ayant fait l'objet de la vérification de conformité

| URL | Statut |
|---|---|
| `/` (Landing) | Conforme axe (0 violation serious/critical) |
| `/login` | Conforme axe (0 violation serious/critical) |
| `/legal` (mentions légales) | Conforme axe |
| `/privacy` (politique de confidentialité) | Conforme axe |
| `/manager`, `/recruiter`, `/clients`, `/clients/:id`, `/jobs`, `/jobs/:id`, `/applications`, `/compare`, `/rgpd` | Audit automatisé non couvert (authentification requise) |

## Retour d'information et contact

Si vous n'arrivez pas à accéder à un contenu ou à un service, vous pouvez contacter le responsable de RecrutAI pour être orienté vers une alternative accessible ou obtenir le contenu sous une autre forme.

- Envoyer un message à **<contact@recrutai.fr>** en précisant l'URL concernée et la difficulté rencontrée. Nous nous engageons à répondre sous 30 jours ouvrés.

## Voies de recours

Cette procédure est à utiliser dans le cas suivant : vous avez signalé au responsable du site internet un défaut d'accessibilité qui vous empêche d'accéder à un contenu ou à un des services du portail et vous n'avez pas obtenu de réponse satisfaisante.

- Écrire un message au [Défenseur des droits](https://www.defenseurdesdroits.fr/nous-contacter)
- Contacter le délégué du Défenseur des droits dans votre région : <https://www.defenseurdesdroits.fr/saisir/delegues>
- Envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) :
    Défenseur des droits — Libre réponse 71120 — 75342 Paris CEDEX 07

---

*Cette déclaration sera mise à jour à chaque évolution majeure du service ou nouvel audit. Prochaine revue prévue : **mai 2027**.*
