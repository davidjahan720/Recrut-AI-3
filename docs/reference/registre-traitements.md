---
type: reference
title: Registre des activités de traitement (RGPD art. 30)
date: 2026-05-04
version: 1.0
responsable: David Jahan — RecrutAI
contact_dpo: contact@recrutai.fr
revue_prevue: 2027-05-04
---

# Registre des activités de traitement

> Document tenu à jour conformément à l'article 30 du RGPD. Doit pouvoir
> être présenté à l'autorité de contrôle (CNIL) sur demande.

## Identification du responsable de traitement

| Champ | Valeur |
|---|---|
| Raison sociale | RecrutAI (entrepreneur individuel — David Jahan) |
| Adresse | [à renseigner] |
| Représentant légal | David Jahan |
| DPO / contact RGPD | contact@recrutai.fr |
| Téléphone | [à renseigner] |

## T01 — Qualification de candidatures par IA

| Champ | Valeur |
|---|---|
| Finalité | Analyser les CVs candidats par rapport à une fiche de poste, attribuer un score, classer en qualifié / rejeté pour faciliter la pré-sélection. |
| Base légale | Intérêt légitime du cabinet de recrutement (art. 6.1.f) — exécution d'une mission contractuelle de recrutement. |
| Personnes concernées | Candidats ayant déposé un CV via la plateforme. |
| Catégories de données | Identité (nom, prénom), contact (email), parcours professionnel (postes, dates, employeurs), formation, compétences, secteur métier. Tout autre élément volontairement présent dans le CV (photo, situation familiale, langues, hobbies). |
| Données sensibles (art. 9) | Aucune collectée volontairement. Si présentes par hasard dans un CV (origine, santé, opinion), ne sont ni indexées ni utilisées dans le scoring. |
| Destinataires | Utilisateurs internes habilités du cabinet (recruteurs, managers). Le client final ne reçoit que les candidats qualifiés affectés à son offre. |
| Sous-traitants | **Mistral AI** (France, UE) — analyse IA et OCR ; **Supabase** (Ireland, UE) — stockage chiffré ; **Vercel** (UE) — hébergement applicatif ; **Brevo** (France, UE) — email transactionnel. |
| Transferts hors UE | Non. Tous les sous-traitants sont en UE ou sous Data Privacy Framework. |
| Durée de conservation | 2 ans après le dernier contact avec le candidat (recommandation CNIL recrutement). Suppression automatique au-delà. |
| Mesures de sécurité | TLS 1.3, stockage chiffré (Supabase Storage privé + JWT), authentification utilisateurs internes, journal RGPD avec hash SHA-256 des emails, suppression effective sur demande (art. 17). |
| Profilage / décision automatisée | OUI — le score IA participe à la décision de qualification. Une revue humaine est imposée avant toute communication au client (art. 22 RGPD). |
| AIPD requise | OUI — voir `docs/explanation/aipd-scoring-cv.md` (à produire). |

## T02 — Gestion CRM clients et offres

| Champ | Valeur |
|---|---|
| Finalité | Suivre la relation commerciale avec les cabinets clients, gérer les fiches de poste, le suivi commercial et la facturation. |
| Base légale | Exécution du contrat (art. 6.1.b). |
| Personnes concernées | Contacts professionnels chez les clients (recruteurs internes, RH, dirigeants). |
| Catégories de données | Identité professionnelle (nom, prénom, fonction), coordonnées professionnelles (email, téléphone), entreprise (nom, secteur, signature). |
| Données sensibles | Aucune. |
| Destinataires | Utilisateurs internes habilités du cabinet. |
| Sous-traitants | **Supabase** (Ireland, UE) — base de données ; **Vercel** (UE) — hébergement. |
| Transferts hors UE | Non. |
| Durée de conservation | Durée de la relation contractuelle + 5 ans (obligations comptables et commerciales). |
| Mesures de sécurité | Idem T01. |
| Profilage | Non. |
| AIPD requise | Non. |

## T03 — Authentification utilisateurs internes

| Champ | Valeur |
|---|---|
| Finalité | Sécuriser l'accès à la plateforme par les recruteurs et administrateurs du cabinet. |
| Base légale | Intérêt légitime à sécuriser le service (art. 6.1.f). |
| Personnes concernées | Salariés ou prestataires habilités du cabinet RecrutAI. |
| Catégories de données | Email professionnel, identifiant de session, mot de passe haché (Supabase Auth — bcrypt), journaux d'authentification. |
| Données sensibles | Aucune. |
| Destinataires | Utilisateurs eux-mêmes, administrateurs systèmes RecrutAI. |
| Sous-traitants | **Supabase** (Ireland, UE) — Auth + DB. |
| Transferts hors UE | Non. |
| Durée de conservation | Compte actif tant que collaboration en cours. Suppression à la fin du contrat. Logs d'authentification : 12 mois. |
| Mesures de sécurité | Mots de passe hachés (bcrypt), TLS 1.3, sessions JWT signées, refresh token rotation. |
| Profilage | Non. |
| AIPD requise | Non. |

## T04 — Notifications email aux clients

| Champ | Valeur |
|---|---|
| Finalité | Avertir le client final, par email, qu'un candidat a été qualifié pour son offre, en transmettant la synthèse de l'analyse IA. |
| Base légale | Exécution du contrat (art. 6.1.b). |
| Personnes concernées | Contact « notification » du client + données du candidat qualifié évoquées dans l'email. |
| Catégories de données | Email destinataire, nom du candidat, score, justification IA, points positifs / négatifs, métadonnées de l'offre. |
| Données sensibles | Aucune. |
| Destinataires | Contact client renseigné dans `clients.notification_email`. |
| Sous-traitants | **Brevo** (ex-Sendinblue, société française) — fournisseur SMTP transactionnel, hébergement UE. |
| Transferts hors UE | Aucun — Brevo opère depuis l'UE. |
| Durée de conservation | Email côté Brevo : politique de rétention par défaut Brevo (90 j sur les logs). Trace en base : champ `email_sent_at` conservé tant que la candidature existe (T01). |
| Mesures de sécurité | TLS 1.3, contenu HTML échappé contre l'injection, destinataire validé (l'email du client réel, plus jamais d'email personnel codé en dur). |
| Profilage | Non. |
| AIPD requise | Non (T01 couvre le profilage). |

## T05 — Journal des actions RGPD

| Champ | Valeur |
|---|---|
| Finalité | Tracer chaque action d'export / rectification / effacement candidat pour répondre à une éventuelle demande d'audit CNIL. |
| Base légale | Obligation légale (art. 5.2 RGPD — accountability). |
| Personnes concernées | Utilisateurs internes ayant déclenché l'action ; candidats ciblés (anonymisés par hash). |
| Catégories de données | Acteur (nom recruteur / email admin), action (export/erase/rectify), hash SHA-256 tronqué de l'email candidat (16 hex), IP source, horodatage, code de retour. |
| Données sensibles | Aucune. |
| Destinataires | Administrateurs RecrutAI uniquement. |
| Sous-traitants | **Vercel** (logs runtime). |
| Transferts hors UE | Non — région Vercel UE. |
| Durée de conservation | 12 mois maximum. |
| Mesures de sécurité | Pas de PII candidat dans les logs (seul le hash) ; logs structurés JSON. |
| Profilage | Non. |
| AIPD requise | Non. |

## Tableau de synthèse

| ID | Traitement | Base légale | Données | Conservation | AIPD |
|---|---|---|---|---|---|
| T01 | Qualification CV par IA | Intérêt légitime | Identité + parcours + score | 2 ans après dernier contact | **OUI** |
| T02 | CRM clients | Contrat | Contacts pro + entreprise | Contrat + 5 ans | Non |
| T03 | Auth utilisateurs | Intérêt légitime | Email + hash mdp | Pendant collaboration | Non |
| T04 | Notifications email | Contrat | Email client + résumé candidat | Politique Brevo + champ `email_sent_at` | Non |
| T05 | Journal RGPD | Obligation légale | Hash + acteur + action | 12 mois | Non |

## Procédures associées

- **Demande d'accès / portabilité** : `docs/how-to/repondre-demande-acces-rgpd.md`
- **Demande d'effacement** : `docs/how-to/repondre-demande-effacement-rgpd.md`
- **Notification de violation < 72 h** : à produire (`docs/how-to/notifier-violation-72h.md`)
- **Onboarding sous-traitant** : à produire (`docs/how-to/onboarder-sous-traitant.md`)
- **AIPD scoring CV** : à produire (`docs/explanation/aipd-scoring-cv.md`)

## Évolutions du registre

| Date | Version | Évolution |
|---|---|---|
| 2026-05-04 | 1.0 | Création initiale, sous-traitant IA = Mistral AI (UE) post-migration depuis Anthropic. |
