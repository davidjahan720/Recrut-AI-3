---
type: explanation
title: AIPD — Analyse d'Impact relative à la Protection des Données — Scoring CV par IA
date: 2026-05-04
version: 1.0
status: draft (à valider par DPO / DPD désigné)
traitement: T01 (cf. docs/reference/registre-traitements.md)
authors: David Jahan
tags: [rgpd, aipd, art22, scoring, ia, mistral]
---

# AIPD — Scoring de candidatures par IA (T01)

## Pourquoi cette AIPD est requise

Le traitement T01 (qualification de candidatures par IA) **est susceptible d'engendrer un risque élevé pour les droits et libertés** des personnes concernées au sens de l'article 35 du RGPD. Les critères déclenchants applicables ici (issus des lignes directrices CNIL/CEPD WP248) :

1. **Évaluation ou notation** : un score sur 100 est attribué à chaque candidat.
2. **Décision automatisée avec effet juridique ou significatif** : la qualification (`qualified` / `rejected`) influe directement sur la suite du processus de recrutement, qui peut entraîner un refus d'embauche → effet significatif au sens de l'art. 22.
3. **Traitement à grande échelle** potentiel (plusieurs cabinets, plusieurs centaines de CVs / mois).

Au moins 2 critères réunis ⇒ AIPD obligatoire.

## Description du traitement

### Nature

Pour chaque CV téléversé sur la plateforme :
1. Extraction du texte (OCR Mistral pour PDFs/images, mammoth pour DOCX, regex pour HTML).
2. Envoi du texte extrait + de la fiche de poste à un modèle Mistral large (`mistral-large-latest`) avec un prompt système structuré.
3. L'IA retourne un objet JSON contenant : score (0-100), justification narrative, points positifs, points négatifs, nom du candidat, email du candidat.
4. Comparaison du score à un seuil défini dans la fiche de poste → classement automatique en `qualified` ou `rejected`.
5. Enregistrement en base + envoi d'email au client si qualifié.

### Portée

- Périmètre géographique : France et UE (clients cabinets de recrutement en territoire UE).
- Catégories de personnes : candidats à un emploi (~quelques centaines par mois en régime nominal).
- Nature des données : identité, parcours professionnel, formation, compétences. Pas de données sensibles (art. 9) volontairement collectées.
- Durée : les données sont conservées 2 ans après dernier contact (cf. T01 du registre).

### Contexte

- Sous-traitant IA : Mistral AI, société française, hébergement UE.
- Aucun transfert hors UE.
- Le scoring n'est qu'une **aide à la décision** : une revue humaine est imposée par le processus métier avant toute communication externe.

### Finalités

Faciliter la pré-sélection des candidatures pour un cabinet de recrutement, réduire le temps de tri manuel, fiabiliser la décision par une grille de scoring objective.

## Nécessité et proportionnalité

### Base légale

Intérêt légitime (art. 6.1.f) : exécution de la mission contractuelle de recrutement, dans des conditions économiques compétitives. Test de mise en balance :
- l'impact sur le candidat est limité (présélection, pas embauche directe) ;
- le candidat est informé du traitement (mention dans la fiche de poste / accusé de réception de candidature, à formaliser systématiquement) ;
- le bénéfice attendu pour le cabinet est concret (gain de temps, équité algorithmique) ;
- pas d'alternative moins intrusive : un tri manuel est techniquement possible mais avec biais cognitifs supérieurs.

### Minimisation

- Seul le **texte** du CV est envoyé à l'IA, pas le PDF binaire (depuis la migration Mistral).
- Le prompt système ne demande pas de données sensibles (origine, religion, santé) — si présentes par accident dans le CV, elles ne sont pas indexées comme variables de scoring.
- Aucune photo n'est utilisée pour scorer.

### Qualité

- Le score est plafonné à 0-100 (validation `validateScoreResult`).
- Si l'IA détecte une incohérence (`is_relevant: false`), le score est forcé entre 0 et 10, justification explicite.
- Mode `response_format: json_object` côté Mistral garantit un retour structuré.

### Information des personnes

À renforcer :
- mention claire dans la fiche de poste publiée par le client final ;
- accusé de réception automatique au candidat lors du dépôt, expliquant le traitement IA et les droits (art. 13) ;
- politique de confidentialité publique (`/privacy`) — déjà en place.

### Exercice des droits

- Droit d'accès / portabilité : `/api/rgpd` action `export` ; how-to dans `docs/how-to/repondre-demande-acces-rgpd.md`.
- Droit à l'effacement : `/api/rgpd` action `erase` ; how-to dans `docs/how-to/repondre-demande-effacement-rgpd.md`.
- Droit de rectification : `/api/rgpd` action `rectify`.
- Droit d'opposition / de ne pas faire l'objet d'une décision automatisée (art. 22.3) : doit être facilité — voir mesure « contestation manuelle » ci-dessous.

## Risques pour les droits et libertés

### R1 — Décision automatisée injuste (biais)

**Sources** : prompts mal calibrés, biais du modèle Mistral, ambiguïté des grilles de scoring.

**Impacts** : refus de candidature pour un motif partiellement biaisé (genre, origine inférée du nom, âge inféré du parcours).

**Vraisemblance** : moyenne. Les LLMs grand public présentent des biais documentés, même atténués sur Mistral.

**Gravité** : importante. Un refus discriminatoire est une atteinte aux droits civils.

**Mesures** :
- ✅ Revue humaine systématique avant communication au client (intégrée au processus métier).
- ✅ Justification narrative obligatoire dans le retour IA (`justification` non vide, validé) — permet un contrôle a posteriori.
- ⏳ **À mettre en place** : audit de biais sur un échantillon trimestriel (50 CVs anonymisés, vérification croisée score IA vs. évaluation humaine).
- ⏳ **À mettre en place** : possibilité explicite pour le candidat de demander un nouvel examen humain (art. 22.3) — bouton dans la déclaration d'accessibilité ou dans le mail de notification.

### R2 — Hallucination IA / données inventées

**Sources** : limitation intrinsèque des LLMs, OCR imparfait sur documents complexes.

**Impacts** : score basé sur des informations qui ne sont pas dans le CV → évaluation erronée.

**Vraisemblance** : moyenne. Mistral large a un taux d'hallucination résiduel sur l'extraction structurée.

**Gravité** : moyenne (peut être détectée à la revue humaine).

**Mesures** :
- ✅ Mode JSON strict (`response_format: json_object`).
- ✅ Validation côté serveur (`validateScoreResult`).
- ⏳ Logger les scores manifestement aberrants pour analyse trimestrielle.

### R3 — Fuite de données candidat vers Mistral

**Sources** : transmission TLS du texte CV à l'API Mistral.

**Impacts** : compromission théorique des données chez le sous-traitant.

**Vraisemblance** : faible. Mistral est ISO 27001, hébergement UE.

**Gravité** : importante (PII complètes du candidat).

**Mesures** :
- ✅ Sous-traitant UE (pas de transfert hors UE).
- ✅ TLS 1.3, clé API rotative (cf. ADR rotation).
- ✅ Pas de cache local du contenu CV au-delà du strict nécessaire.
- ⏳ Signer le DPA Mistral si pas encore fait.
- ⏳ Politique de purge effective (cf. R5).

### R4 — Réidentification via les logs

**Sources** : journalisation server-side.

**Impacts** : un email candidat retrouvable dans les logs Vercel/Supabase.

**Vraisemblance** : très faible (pas de PII brute en logs depuis la session conformité).

**Gravité** : moyenne.

**Mesures** :
- ✅ Logs RGPD avec hash SHA-256 tronqué (jamais l'email en clair).
- ✅ Logs erreurs Mistral : code HTTP uniquement, pas le payload.
- ✅ Rétention logs : 12 mois max (cf. T05).

### R5 — Conservation excessive

**Sources** : pas de purge automatique en place jusqu'ici.

**Impacts** : violation de l'art. 5.1.e (limitation de la conservation).

**Vraisemblance** : certaine si pas implémenté.

**Gravité** : importante.

**Mesures** :
- ⏳ **À implémenter dans cette PR** : Edge function `purge-expired` + cron Supabase quotidien — supprime les `applications` dont `created_at < now() - 2 years` ainsi que leurs CVs Storage.
- ✅ Documentation procédure (`docs/how-to/configurer-purge-automatique.md` à produire).

### R6 — Non-respect des droits art. 22

**Sources** : utilisateur final qui ne sait pas qu'il peut s'opposer à la décision automatisée.

**Impacts** : non-conformité art. 22.3.

**Vraisemblance** : élevée si non documenté.

**Gravité** : moyenne.

**Mesures** :
- ✅ Politique de confidentialité publique (`/privacy`) mentionne les droits.
- ⏳ Ajouter une mention explicite « Demander un examen humain » dans les mails clients + sur la page dédiée RGPD candidat (à créer en prochaine itération).

## Synthèse résiduelle

| Risque | Vraisemblance | Gravité | Mesures couvertes | Risque résiduel |
|---|---|---|---|---|
| R1 Biais | Moyenne | Importante | Revue humaine, justification | **Modéré** — audit trimestriel à activer |
| R2 Hallucination | Moyenne | Moyenne | JSON strict, validation | Faible |
| R3 Fuite Mistral | Faible | Importante | UE, TLS, rotation clés | Faible |
| R4 Logs | Très faible | Moyenne | Hash SHA-256 | Très faible |
| R5 Conservation | Certaine si non corrigé | Importante | Cron purge à implémenter | **Important tant que non livré** — couvert par cette PR |
| R6 Art. 22 | Élevée | Moyenne | Politique publique | **Modéré** — mention explicite à ajouter |

## Plan d'action

1. ✅ Migration sous-traitant Mistral UE (livré)
2. ✅ Endpoints art. 15-17 (livré)
3. ✅ Logs sans PII (livré)
4. **En cours** : cron de purge automatique 2 ans (cette PR)
5. **À faire** : audit trimestriel de biais (procédure interne, non technique)
6. **À faire** : mention explicite « examen humain » dans le mail client
7. **À faire** : signature DPA Mistral

## Validation

Cette AIPD doit être :
- ✅ relue et co-signée par le DPO / DPD désigné (David Jahan, par défaut, en l'absence d'externalisation) ;
- ⏳ versionnée dans Git (versions futures = ce fichier mis à jour, datées dans le frontmatter) ;
- ⏳ présentée en cas de contrôle CNIL (l'AIPD doit pouvoir être démontrée même si elle n'a pas à être déposée).

Statut actuel : **draft 1.0** — à valider par David Jahan en tant que responsable de traitement.
