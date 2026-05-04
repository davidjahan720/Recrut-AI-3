---
type: explanation
title: ADR 001 — Migration Anthropic Claude vers Mistral AI
date: 2026-05-04
status: accepted
authors: David Jahan
tags: [rgpd, ia, sous-traitants, souverainete]
---

# ADR 001 — Migration Anthropic Claude vers Mistral AI

## Contexte

RecrutAI 2 utilisait Anthropic Claude (`claude-sonnet-4-6` pour le scoring, `claude-opus-4-7` pour le parsing de fiches de poste) comme moteur d'analyse IA des CV et fiches de poste. L'API Anthropic est opérée depuis les États-Unis. Or, RecrutAI 2 traite des données personnelles relevant du RGPD :

- nom, prénom, email, parcours professionnel des candidats ;
- coordonnées des contacts RH des clients (PII de tiers).

Cette utilisation impose des garanties contractuelles spécifiques (DPA, clauses contractuelles types) et un suivi de la base juridique de transfert (Data Privacy Framework, à risque depuis Schrems II et son éventuelle invalidation). Côté souveraineté numérique et durabilité, l'usage d'un fournisseur états-unien était également un point d'attention pour des cabinets de recrutement français/européens.

## Décision

Remplacer Anthropic Claude par **Mistral AI** comme fournisseur unique d'IA pour les traitements suivants :

- analyse et scoring des CV par rapport à une fiche de poste (`mistral-large-latest`) ;
- extraction structurée des coordonnées clients depuis un PDF de fiche de poste (`mistral-large-latest`) ;
- extraction du contenu textuel des PDF et images (`mistral-ocr-latest`).

Les flux DOCX et HTML restent traités localement (mammoth, regex) sans appel IA pour cette étape — seul le scoring final passe par Mistral.

## Conséquences

### Positives

- **RGPD** : Mistral AI est une société française (siège Paris), API opérée en Union européenne. Aucun transfert hors UE pour les traitements de PII candidats. Plus besoin de DPF ou de CCT pour ce sous-traitant. Réduction du périmètre AIPD.
- **Souveraineté** : aligne RecrutAI 2 avec la stratégie d'IA souveraine européenne, argument commercial pour les cabinets francophones.
- **Sobriété (RGESN 4.7)** : suppression de la dépendance NPM `@anthropic-ai/sdk` (~250 ko) au profit de `fetch` natif. Pas de SDK installé côté serveur.
- **Robustesse de parsing** : Mistral expose nativement `response_format: { type: 'json_object' }`, ce qui supprime une partie de l'extraction par regex post-réponse.
- **Coût** : tarification Mistral généralement inférieure pour les modèles équivalents.

### Négatives ou neutres

- **Qualité** : Mistral Large 2 est compétitif avec Claude Sonnet sur les tâches d'extraction structurée et de raisonnement court (cf. benchmarks publics MMLU, HumanEval). Risque résiduel sur les cas-limites de scoring CV — à monitorer.
- **OCR** : Claude pouvait ingérer un PDF directement. Mistral nécessite un appel `mistral-ocr-latest` préalable pour les PDF et images. Cela ajoute un appel API par CV au format binaire (DOCX/HTML restent en un seul appel). Latence ajoutée : ~1-2 s par CV PDF.
- **Migration** : tous les secrets `ANTHROPIC_API_KEY` à supprimer côté Vercel et Supabase Edge Functions, à remplacer par `MISTRAL_API_KEY`.

## Alternatives écartées

- **Anthropic via AWS Bedrock région Paris** : maintient la dépendance contractuelle à Anthropic Inc. (US) malgré un hébergement UE. Couteux à mettre en place sur un projet de cette taille.
- **Auto-hébergé (Llama, Mistral open weights via Ollama / vLLM)** : coût d'infrastructure GPU non justifié au volume actuel ; perte de la maintenance modèle.
- **OpenAI** : siège US, mêmes problématiques que Claude. Aucun gain RGPD.

## Conformité

- **RGPD art. 28** (sous-traitants) : DPA Mistral signé, hébergement UE.
- **RGPD art. 44+** (transferts hors UE) : aucun, supprimés par cette migration.
- **RGPD art. 32** (sécurité) : TLS 1.3, secrets en variables d'environnement chiffrées (Vercel + Supabase), pas de PII journalisée.
- **RGESN 4.7** (sobriété logicielle) : retrait d'une dépendance NPM, fetch natif Node 18+ et Deno.

## Suivi

- Monitorer le taux d'erreurs `Mistral chat HTTP *` et `Mistral OCR HTTP *` dans Sentry.
- Comparer la qualité de scoring (taux de candidats qualifiés / rejetés / erreur) avant et après migration sur 50 CV.
- Mettre à jour le registre des traitements (`docs/reference/registre-traitements.md`) — substitution sous-traitant.
- Mettre à jour la déclaration d'accessibilité et la politique de confidentialité (déjà fait dans `recrutai/src/pages/Legal.tsx`).
