---
type: how-to
title: Notifier une violation de données personnelles sous 72 h (RGPD art. 33-34)
audience: responsable de traitement (David Jahan), DPO
duration: 30 minutes à 4 heures selon ampleur
prerequisites:
  - accès admin aux logs Vercel et Supabase
  - accès à la console CNIL (notifications.cnil.fr)
  - connaissance du registre des traitements
---

# Notifier une violation de données sous 72 h

> **Délai légal** : 72 heures à compter de la prise de connaissance, conformément à l'article 33 du RGPD. Ce compte commence à courir dès qu'un membre de l'équipe a un soupçon raisonnable de violation, pas après confirmation.

## Définition

Une **violation de données personnelles** est un incident entraînant, de manière accidentelle ou illicite :
- la **destruction** de données ;
- la **perte** ;
- l'**altération** ;
- la **divulgation** non autorisée ;
- l'**accès** non autorisé.

Exemples concrets sur RecrutAI 2 :
- Fuite de la `SUPABASE_SERVICE_ROLE_KEY` (compromission Vercel ou GitHub).
- CV téléchargé par un tiers via une URL signée mal sécurisée.
- Suppression accidentelle massive de candidatures.
- Phishing réussi sur un compte recruteur.
- Fuite via les logs si une PII s'y est glissée.

## Étapes

### Phase 1 — H+0 → H+2 : Confinement et qualification

1. **Stopper la fuite si en cours** :
   - Si compromission de clé : `vercel env rm <KEY> production` immédiatement, regénérer côté provider, repousser la nouvelle valeur.
   - Si accès non autorisé via Supabase : invalider toutes les sessions (`auth.admin.signOut`), regénérer la `SERVICE_ROLE_KEY` côté Supabase Dashboard.
   - Si compromission GitHub : révoquer les tokens, vérifier l'historique d'accès, retirer les collaborateurs suspects.
2. **Préserver les preuves** : capturer les logs Vercel et Supabase de la période concernée (avant rotation des clés). `vercel logs <deployment>` et Dashboard Supabase → Logs.
3. **Identifier l'ampleur** :
   - combien de personnes concernées ?
   - quelles catégories de données (cf. registre des traitements T01-T05) ?
   - quelle est la nature de la violation (CIA — Confidentialité / Intégrité / Disponibilité) ?

### Phase 2 — H+2 → H+24 : Notification CNIL

4. **Déterminer si la notification est obligatoire** :
   - Notification CNIL obligatoire **sauf si** la violation n'est pas susceptible d'engendrer un risque pour les droits et libertés (à motiver par écrit).
   - En cas de doute, **notifier** : la non-notification est sanctionnée plus sévèrement qu'une notification finalement non requise.
5. **Notifier la CNIL** sur https://notifications.cnil.fr :
   - Indiquer la nature de la violation (CIA), le moment de la prise de connaissance.
   - Décrire les catégories de personnes concernées + nombre approximatif.
   - Décrire les catégories de données + nombre approximatif d'enregistrements.
   - Indiquer les conséquences probables.
   - Décrire les mesures prises pour endiguer / atténuer.
   - Si toutes les informations ne sont pas connues, faire une **notification initiale** puis compléter ultérieurement (l'art. 33.4 le permet explicitement).
6. **Conserver l'accusé de réception** CNIL dans `docs/incidents/<date>-<slug>/`.

### Phase 3 — H+24 → H+72 : Notification aux personnes (si risque élevé)

7. **Évaluer le risque pour les personnes** : violation susceptible d'engendrer un **risque élevé** pour les droits et libertés ?
   - Cas de risque élevé : fuite de CVs candidats vers un tiers identifié, fuite d'identifiants permettant d'usurper l'identité, etc.
   - Si oui : **information directe des personnes** dans les meilleurs délais.
8. **Rédiger la communication** :
   - en langage clair (pas de jargon juridique) ;
   - description de la nature de la violation ;
   - point de contact (DPO / contact@recrutai.fr) ;
   - conséquences probables ;
   - mesures prises ;
   - recommandations à la personne (changer mot de passe, surveiller compte, etc.).
9. **Diffuser** : email transactionnel (Brevo) à l'ensemble des personnes concernées. Si trop nombreux ou contact difficile : communication publique sur le site (page dédiée + bandeau d'information).

### Phase 4 — Post-incident : RETEX et registre

10. **Documenter dans le registre des violations** : créer `docs/incidents/<YYYY-MM-DD>-<slug>/` contenant :
    - chronologie des événements ;
    - personnes / données concernées ;
    - notifications envoyées (CNIL + personnes) ;
    - mesures correctives ;
    - leçons apprises.
11. **Tenir un registre interne** des violations même non notifiées (art. 33.5) — il doit pouvoir être présenté à la CNIL en contrôle.
12. **RETEX en équipe** : programmer une revue post-incident dans les 7 jours, mettre à jour les ADR / how-to si la violation révèle un trou de sécurité reproductible.

## Modèle de chronologie (à adapter)

| Heure | Action | Acteur |
|---|---|---|
| H+0 | Détection (alerte / log / signalement) | tech / utilisateur |
| H+0+5 min | Confirmation par un 2e regard | DPO |
| H+0+30 min | Contention (rotation clés, blocage compte) | dev / admin |
| H+1 | Constitution du dossier de qualification | DPO |
| H+24 | Notification CNIL initiale | DPO |
| H+48 | Notification aux personnes si risque élevé | DPO + Comm |
| H+72 | Notification CNIL complète si infos initialement manquantes | DPO |
| H+7 j | RETEX | Équipe |

## Cas particuliers

### Violation détectée par un tiers (chercheur, candidat)

- Remercier la personne et créer un canal sécurisé pour la transmission des détails.
- Le délai 72 h court à partir du moment où l'équipe a pris connaissance, pas du moment de la découverte par le tiers.

### Violation chez un sous-traitant (Mistral, Supabase, Vercel, Brevo)

- Le sous-traitant doit nous notifier sans délai (clause contractuelle DPA).
- Notre délai 72 h court à partir de **notre** prise de connaissance.
- La notification CNIL est faite par RecrutAI (responsable de traitement), pas par le sous-traitant.

## Outils disponibles

- **Console CNIL** : https://notifications.cnil.fr
- **Modèle de notification CNIL** : https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles
- **Templates internes** : `docs/incidents/_templates/` (à créer)

## Délais légaux à respecter

| Délai | Action |
|---|---|
| **72 h** | Notification CNIL (art. 33.1) |
| **Dans les meilleurs délais** | Information des personnes si risque élevé (art. 34.1) |
| **5 ans** | Conservation du registre des violations (preuve d'accountability) |
