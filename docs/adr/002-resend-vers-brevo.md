---
type: explanation
title: ADR 002 — Migration Resend vers Brevo (sous-traitant email transactionnel)
date: 2026-05-04
status: accepted
authors: David Jahan
supersedes: none
tags: [rgpd, email, sous-traitants, souverainete]
---

# ADR 002 — Migration Resend vers Brevo

## Contexte

RecrutAI 2 utilisait [Resend](https://resend.com) comme fournisseur SMTP transactionnel pour deux usages :
- T04 du registre : email de notification au client lorsqu'un candidat est qualifié (Edge Function `score-cv`).
- Email DPO lors d'une demande d'examen humain art. 22.3 (Vercel function `/api/rgpd` action `request-review`).

Resend est une société **états-unienne** dont l'infrastructure est mixte UE/US et qui s'appuie sur le **Data Privacy Framework** pour les transferts. Cela introduit :
- une dépendance à la stabilité du DPF (jurisprudentiellement fragile depuis Schrems II) ;
- une boucle réglementaire pour chaque évolution contractuelle ;
- un signal non aligné avec notre positionnement « pile UE / IA souveraine » (ADR 001 Mistral, hébergement Supabase Ireland, app Vercel UE).

## Décision

Remplacer Resend par **[Brevo](https://www.brevo.com)** (anciennement Sendinblue) :
- **Société française** (siège Paris).
- **Hébergement UE** par défaut (data centers en France).
- **API REST** simple (`POST https://api.brevo.com/v3/smtp/email`), pas besoin de SDK.
- **Plan gratuit** suffisant pour les volumes RecrutAI 2 (300 emails/jour).
- DPA disponible publiquement, conforme art. 28 RGPD.

Variables d'environnement :
- `BREVO_API_KEY` (remplace `RESEND_API_KEY`).
- `BREVO_SENDER_EMAIL` — adresse expéditeur validée dans Brevo (obligatoire en production).
- `BREVO_SENDER_NAME` — nom affiché de l'expéditeur (optionnel, défaut « RecrutAI »).

Endpoints concernés :
- `recrutai/api/rgpd.ts` (action `request-review`).
- `recrutai/supabase/functions/score-cv/index.ts` (notification client lors d'une qualification).
- Suppression de `recrutai/api/send-analysis.ts` et `supabase/functions/send-analysis/` (jamais appelés depuis le frontend, libèrent 1 slot Vercel).

## Conséquences

### Positives

- **RGPD art. 44+** : aucun transfert hors UE pour le canal email. Suppression de la dépendance au DPF.
- **Souveraineté** : tous les sous-traitants RecrutAI 2 sont désormais opérés depuis l'UE (Mistral France, Supabase Ireland, Vercel UE, Brevo France).
- **Simplicité contractuelle** : DPA Brevo signable en clic-through sur leur portail, en français.
- **Sobriété (RGESN 4.7)** : Brevo via `fetch` natif, plus de SDK `resend` à embarquer dans l'Edge Function (~50 ko gain marginal mais cohérent avec la doctrine).

### Neutres ou négatives

- **Délivrabilité** : Brevo a une bonne réputation IP en UE mais demande la **vérification du domaine d'envoi** (DNS SPF + DKIM) pour passer hors quarantaine. Tant que le domaine `recrutai.fr` n'est pas vérifié, on doit utiliser un sender Brevo de test ou attendre la propagation DNS.
- **Dashboard / UX développeur** : Resend offre un meilleur DX (dashboard, debug). Brevo est plus orienté marketing et a un dashboard plus chargé. Acceptable pour un usage transactionnel limité.
- **API** : Brevo expose un format `htmlContent` et `sender: { name, email }` au lieu de `from: "Name <email>"` chez Resend. Léger refactor, pas un blocage.

## Alternatives écartées

- **Mailjet** (Pathwire / Sinch) — société française à l'origine mais rachetée par un groupe US/suédois. Moins clair côté souveraineté.
- **Postmark** — qualité de delivery excellente, mais société US.
- **AWS SES UE** — bonne option UE-native mais coût d'intégration / IAM élevé pour un volume modeste.
- **SendGrid** — US, écarté pour les mêmes raisons que Resend.

## Mise en œuvre

1. Migration code (`fetch` POST `https://api.brevo.com/v3/smtp/email`).
2. Suppression des dépendances Resend (`Resend` import esm.sh).
3. Variables d'env : `BREVO_*` ajoutées, `RESEND_API_KEY` à supprimer côté Vercel et Supabase secrets.
4. Mise à jour du registre des traitements (T04), de la politique de confidentialité publique, des how-to (notifier-violation-72h, onboarder-sous-traitant, traiter-demande-examen-humain), du plan de monitoring.
5. Suppression des endpoints `send-analysis` (Vercel + Edge) qui étaient inutilisés.
6. **[ACTION REQUISE]** côté ops : signer le DPA Brevo, créer la clé API, valider le domaine d'envoi DNS, pousser `BREVO_API_KEY` côté Vercel et Supabase.

## Conformité

- **RGPD art. 28** (sous-traitants) : DPA Brevo à signer, hébergement UE.
- **RGPD art. 44+** (transferts hors UE) : éliminés sur le canal email.
- **RGESN 4.7** (sobriété) : retrait du SDK Resend, fetch natif.

## Suivi

- Monitorer le taux d'erreurs `Brevo HTTP *` dans les logs Sentry / Vercel.
- Vérifier la délivrabilité côté Brevo dashboard pendant la première semaine.
- Mettre à jour le registre des traitements (`docs/reference/registre-traitements.md`).
