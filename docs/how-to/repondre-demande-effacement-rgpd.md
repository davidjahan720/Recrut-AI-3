---
type: how-to
title: Répondre à une demande d'effacement RGPD (art. 17 — droit à l'oubli)
audience: utilisateur interne (recruteur, admin)
duration: 3 minutes
prerequisites:
  - être connecté à RecrutAI 2 avec un compte recruteur ou admin
  - disposer de l'email du candidat demandeur
  - avoir vérifié l'identité du demandeur (cf. « Points d'attention » ci-dessous)
---

# Répondre à une demande d'effacement RGPD

> Le candidat dispose du droit à l'effacement de ses données (RGPD art. 17). L'opération est **irréversible**.

## Étapes

1. **Vérifier l'identité du demandeur** avant tout traitement (cf. ci-dessous).
2. Ouvrir RecrutAI 2 → menu latéral → **RGPD**.
3. Saisir l'email du candidat → **Rechercher**.
4. Vérifier que la liste des candidatures retournées correspond bien au demandeur.
5. **Optionnel mais recommandé** : cliquer d'abord sur **Télécharger l'export JSON** pour conserver une copie chiffrée localement avant suppression (utile en cas de contestation ultérieure ou d'obligation légale de conservation partielle).
6. Cliquer sur **Effacer toutes les données** dans le bloc rouge.
7. Confirmer dans la boîte de dialogue de votre navigateur.
8. Vérifier le message de confirmation : nombre de candidatures supprimées et nombre de CVs supprimés du Storage.
9. Notifier le candidat de la bonne exécution de sa demande.

## Ce qui est effacé

- Toutes les candidatures (`applications`) liées à l'email.
- Tous les fichiers CV téléversés (Supabase Storage).
- Les analyses IA, scores, justifications et points positifs/négatifs associés.

## Ce qui n'est pas effacé

- Les enregistrements `seed/` (CVs de démonstration) — sauf à demander explicitement leur purge.
- Les logs Vercel/Supabase contenant uniquement le hash court de l'email (anonymes, conservés 12 mois).
- Les emails de notification déjà transmis aux clients (relevant de leur messagerie).

## Vérifier l'identité du demandeur

Pour éviter qu'un tiers ne demande l'effacement à la place du candidat :

- Si la demande arrive par email, vérifier que l'expéditeur correspond à l'email enregistré dans RecrutAI 2.
- En cas de doute, demander une copie d'une pièce d'identité (à supprimer après vérification).
- Documenter la vérification effectuée (note interne datée).

## Points d'attention

- **Délai légal** : 1 mois maximum (RGPD art. 12.3), prolongeable de 2 mois si justifié.
- **Cas où l'effacement peut être refusé** (motiver par écrit) :
  - obligation légale de conservation (ex. comptabilité — ne s'applique pas aux CVs candidats sauf cas particulier) ;
  - exercice ou défense de droits en justice ;
  - intérêt public (rare en recrutement privé).
- **Ne pas effacer si** vous avez encore une mission active pour ce candidat — informer d'abord le client puis traiter.

## En cas de problème

| Symptôme | Action |
|---|---|
| L'effacement renvoie une erreur | rafraîchir la page, vérifier que la session n'a pas expiré, retenter |
| Le compteur de CVs effacés est à 0 alors que des candidatures avaient un CV | les fichiers étaient peut-être déjà absents du Storage ; vérifier les logs |
| Le candidat redépose un CV après effacement | le système peut accepter (nouvelle candidature), pas de blocage automatique |

## Documentation

Le serveur journalise chaque effacement (hash de l'email, agent, IP, horodatage). Cette trace permet d'attester l'exécution sans conserver de PII.
