---
type: how-to
title: Traiter une demande d'examen humain (RGPD art. 22.3)
audience: délégué à la protection des données, responsable de traitement
duration: 30 minutes à 1 heure par demande
prerequisites:
  - accès à la boîte mail DPO (contact@recrutai.fr ou variable DPO_EMAIL)
  - accès admin à la plateforme RecrutAI 2
---

# Traiter une demande d'examen humain

> Le candidat dispose, en vertu de l'article 22.3 du RGPD, du droit d'obtenir l'intervention humaine sur toute décision automatisée qui le concerne. Délai légal de réponse : **1 mois** (RGPD art. 12.3), prolongeable de 2 mois si justifié.

## Comment les demandes arrivent

Trois canaux possibles :

1. **Formulaire en ligne** — `/contestation` envoie un email à l'adresse `DPO_EMAIL` via Brevo. Sujet : `[RGPD art. 22.3] Demande d'examen humain — <candidat>`. C'est le canal nominal.
2. **Email direct** à `contact@recrutai.fr`.
3. **Courrier postal** (rare).

Quel que soit le canal, la procédure est la même.

## Procédure

### 1. Accuser réception (24-48 h)

Répondre au demandeur par email avec :
- Confirmation que la demande est bien reçue.
- Numéro de référence interne (date + 4 caractères aléatoires : `2026-05-04-A3F2`).
- Délai prévisionnel (1 mois maximum).
- Lien vers la politique de confidentialité.

### 2. Vérifier l'identité du demandeur

Pour éviter qu'un tiers usurpe l'identité du candidat :

- Vérifier que l'email du demandeur correspond bien à celui présent en base (`SELECT * FROM applications WHERE candidate_email = '...'`).
- Si différent (avocat, association) : demander un mandat ou pièce d'identité (à supprimer après vérification).
- Si aucune candidature trouvée : informer poliment qu'aucune donnée n'est détenue.

### 3. Récupérer le contexte

Sur la plateforme :

1. Ouvrir `/rgpd` (page interne).
2. Saisir l'email du candidat → **Rechercher**.
3. Cliquer sur **Télécharger l'export JSON** pour avoir l'historique complet des candidatures, scores, justifications, points positifs/négatifs.
4. Ouvrir le ou les CV téléversés (URL signée 1h).

### 4. Réexamen humain

Lire le CV original **sans regarder le score IA** dans un premier temps. Évaluer le profil par rapport à la fiche de poste avec votre œil de recruteur.

Comparer ensuite avec :
- la **justification IA** ;
- les **points positifs / négatifs** identifiés.

Identifier :
- des **éléments factuels manqués** par l'IA (ex. expérience pertinente non détectée) ;
- des **biais possibles** (genre, origine, âge inférés) ;
- une **interprétation erronée** du parcours.

### 5. Décision

Trois issues possibles :

| Issue | Action |
|---|---|
| **Score juste, motivation insuffisante** | Confirmer le rejet, motiver précisément la décision. Renvoyer la justification IA + le complément humain. |
| **Score juste mais à nuancer** | Maintenir la décision globale, mais reconnaître les éléments soulevés. Proposer un entretien à l'avenir si nouveau poste pertinent. |
| **Score manifestement biaisé / inadapté** | Annuler la décision automatisée. Réintégrer le candidat dans le processus, voire transmettre directement au client avec la nouvelle évaluation humaine. |

### 6. Réponse motivée

Email au demandeur contenant :

- Décision (maintien / nuance / annulation).
- **Motivation détaillée** (pas un boilerplate — RGPD impose une réponse personnalisée).
- Mention des voies de recours :
  - réclamation auprès de la [CNIL](https://www.cnil.fr) ;
  - saisine du juge en cas de discrimination présumée.
- Coordonnées du DPO pour échange complémentaire.

### 7. Si la décision est annulée

- Mettre à jour le statut de la candidature dans la plateforme (via `/rgpd` → rectification ou directement en base).
- Notifier le client final si la candidature avait été partagée (annulation explicite de la transmission).
- Documenter l'incident dans `docs/incidents/<date>-art22-<slug>.md` (anonymisé).

### 8. Documenter dans le registre des activités

Tenir un journal interne des demandes art. 22.3 traitées avec :
- date de la demande, date de la réponse ;
- nature (revue / annulation / maintien) ;
- éventuels biais corrigés (alimente le RETEX modèle / prompt de l'IA).

Cela permet d'ajuster :
- le prompt système Mistral si un biais récurrent est détecté ;
- la grille de scoring ;
- les modes de communication.

## Cas particuliers

### Demande manifestement abusive

Si la demande est manifestement infondée (ex. demandes répétitives sans nouvel élément, insultes, tentative de pression), vous pouvez :
- **refuser** en motivant par écrit ;
- **facturer** un montant raisonnable (rare mais autorisé par l'art. 12.5).

### Demande sur une candidature ancienne

Si la candidature est antérieure à 2 ans, elle a normalement été purgée par le job automatique (`docs/how-to/configurer-purge-automatique.md`). Informer le candidat que les données ont été effacées dans le cadre de la rétention CNIL ; il peut redéposer un CV s'il le souhaite.

### Demande venue après transmission au client

Si la candidature a déjà été transmise au client final, prévenir le client de la demande. Le client dispose lui aussi du droit de recevoir un avis humain sur le profil — coordonner pour éviter les doubles évaluations.

## Outils

- Page interne RGPD : `/rgpd` (recherche + export + rectification + effacement).
- Boîte DPO : `DPO_EMAIL` (variable Vercel, défaut `contact@recrutai.fr`).
- Logs : `console.log` structurés `type: 'rgpd_review_request'` côté Vercel function logs.

## Délais à respecter

| Étape | Délai |
|---|---|
| Accusé de réception | 24-48 h |
| Réponse motivée | 1 mois (art. 12.3), prolongeable 2 mois |
| Notification du client si annulation | Sous 7 jours |
| Mise à jour du prompt si biais identifié | Trimestriel (RETEX consolidé) |
