---
type: how-to
title: Onboarder un nouveau sous-traitant (RGPD art. 28)
audience: responsable de traitement, DPO
duration: 2 à 5 jours selon réactivité du sous-traitant
prerequisites:
  - identification du besoin (quel traitement, quelles données)
  - validation du budget et de l'arbitrage technique préalable (ADR si décision structurante)
---

# Onboarder un nouveau sous-traitant

> Tout prestataire qui traite des données personnelles **pour notre compte** est un sous-traitant au sens RGPD art. 28. Cela impose un cadrage contractuel et documentaire avant le début du traitement.

## Étapes

### 1. Vérifier que c'est bien un sous-traitant

- **Sous-traitant** = traite des données personnelles **pour notre compte**, sur instruction (ex. Mistral, Supabase, Resend, Vercel).
- **Co-responsable** = définit conjointement les finalités (rare).
- **Responsable distinct** = traite pour son propre compte (ex. fournisseur d'analytics qui collecte aussi pour lui — à éviter).

Si le prestataire ne traite que des **données techniques anonymes** (ex. un CDN qui sert des assets sans cookies), il n'est pas sous-traitant au sens RGPD — la procédure est allégée.

### 2. Audit des garanties (avant signature)

Vérifier les points suivants sur le site / la documentation publique du prestataire :

| Critère | Recherche | Statut acceptable |
|---|---|---|
| Localisation des serveurs | « data centers », « region » | UE prioritairement, sinon DPF + CCT |
| Certifications | ISO 27001, SOC 2 Type II, HDS | Au moins une |
| DPA téléchargeable | « Data Processing Addendum », « DPA » | Présent, signé en ligne ou par contrat |
| Politique de notification de violation | clause de notification | < 72 h en pratique, idéalement |
| Sous-traitants ultérieurs | liste publique | Doit être transparente |
| Engagement de suppression | clause fin de contrat | Suppression / restitution sur demande |
| AIPD interne | publiée éventuellement | Bonus si oui |

**Stop si** :
- pas de DPA disponible ;
- localisation hors UE sans DPF ni CCT signables ;
- absence de notification de violation contractuelle.

### 3. Signer le DPA (Data Processing Agreement)

- Pour les éditeurs SaaS, le DPA est généralement disponible en clic-through ou téléchargement (ex. Mistral, Vercel, Supabase).
- Conserver une **copie signée** dans `docs/contrats/<sous-traitant>/dpa-<date>.pdf`.
- Vérifier les mentions obligatoires de l'art. 28.3 RGPD :
  - objet et durée du traitement ;
  - nature et finalité ;
  - type de données et catégories de personnes ;
  - obligations et droits du responsable ;
  - confidentialité du personnel ;
  - sécurité (art. 32) ;
  - sous-traitance ultérieure (autorisée préalable) ;
  - assistance pour les droits des personnes ;
  - assistance pour les notifications de violation ;
  - suppression / restitution en fin de contrat ;
  - audits possibles.

### 4. Mettre à jour les artefacts internes

a) **Registre des traitements** (`docs/reference/registre-traitements.md`) :
   - dans le traitement concerné, ajouter le sous-traitant à la ligne « Sous-traitants ».
   - mentionner la localisation, le statut DPF / CCT.

b) **Politique de confidentialité publique** (`recrutai/src/pages/Legal.tsx`, mode `privacy`) :
   - section « Destinataires et sous-traitants » : ajouter une ligne pour ce nouveau prestataire.
   - mentionner localisation et garanties contractuelles.
   - **redéployer** le site afin que la nouvelle politique soit publiée avant que les données ne commencent à transiter.

c) **ADR Diátaxis** si décision structurante (`docs/explanation/adr-XXX-<slug>.md`) :
   - rédiger un ADR justifiant le choix de ce sous-traitant, alternatives envisagées, conséquences.

d) **Variables d'environnement** :
   - ajouter les clés / tokens dans Vercel et Supabase secrets.
   - **jamais en clair dans Git**.
   - ajouter à la `INSTALL.md` les nouvelles variables et leur source.

### 5. Modifier le code applicatif

- Limiter les appels au sous-traitant au strict nécessaire (minimisation art. 5.1.c).
- Ne **jamais** logger en clair les payloads envoyés (`console.log` interdit sur PII — utiliser des hash si traçabilité nécessaire).
- TLS 1.3 obligatoire sur tous les appels sortants (par défaut avec `fetch`).
- Gérer les erreurs sans révéler la stack côté client.
- Si le sous-traitant fournit un SDK lourd, **préférer le `fetch` natif** pour la sobriété (RGESN 4.7) — sauf justification.

### 6. Tester en conditions réelles

- Faire un appel test avec un payload bidon sur l'environnement de staging / preview.
- Vérifier les codes HTTP de retour, la latence, la robustesse aux erreurs.
- Si le sous-traitant a un mode « sandbox », l'utiliser pour les tests d'intégration en CI.

### 7. Notifier les personnes concernées (si pertinent)

- Si l'arrivée d'un nouveau sous-traitant **modifie matériellement** la politique de confidentialité (ex. nouveau pays, nouveau type de données traitées), notifier les utilisateurs existants.
- Pour de nouveaux candidats / clients, la mise à jour de la politique publique suffit (consentement implicite à la nouvelle version au prochain dépôt).

### 8. Documenter dans la fiche sous-traitant

Créer (ou mettre à jour) `docs/contrats/<sous-traitant>/README.md` avec :
- nom du prestataire, URL, contact ;
- date de signature du DPA et lien vers le PDF ;
- périmètre exact (quels traitements T0X) ;
- liste des sous-traitants ultérieurs autorisés ;
- date de dernière revue contractuelle ;
- date de revue suivante (annuelle recommandée).

## Cas concrets observés sur RecrutAI 2

| Sous-traitant | Statut | Périmètre | DPA |
|---|---|---|---|
| Mistral AI | Activé 2026-05-04 | T01 (analyse CV) | À signer ([Mistral DPA](https://mistral.ai/legal/data-processing-addendum)) |
| Supabase | Activé | T01-T05 (DB + Storage + Auth) | DPA inclus dans les CGU Supabase |
| Vercel | Activé | T01-T05 (hébergement) | DPA inclus dans les CGU Vercel |
| Resend | Activé | T04 (emails) | DPA téléchargeable |
| Anthropic | **Désactivé** 2026-05-04 | (ancien T01) | Migration → Mistral, supprimer la clé API |

## Décommissionnement d'un sous-traitant

À l'inverse, lorsqu'on cesse d'utiliser un sous-traitant :

1. Supprimer la clé API / token côté Vercel et Supabase secrets.
2. Demander au sous-traitant la **suppression** ou la **restitution** des données (clause art. 28.3.g) — conserver la preuve écrite.
3. Mettre à jour le registre, la politique de confidentialité, l'INSTALL.md.
4. Supprimer le code mort (SDK, helpers).
5. Documenter dans `docs/contrats/<sous-traitant>/decommission-<date>.md`.

## Délais et bonnes pratiques

- **Avant le premier appel** : DPA signé + politique publique mise à jour.
- **Tous les ans** : revue contractuelle (changement de sous-traitants ultérieurs, nouveau pays d'hébergement, etc.).
- **À chaque incident chez le sous-traitant** : évaluer si déclenche une notification de violation côté RecrutAI.
