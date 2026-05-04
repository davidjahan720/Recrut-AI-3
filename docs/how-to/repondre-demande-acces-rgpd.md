---
type: how-to
title: Répondre à une demande d'accès RGPD (art. 15 + 20)
audience: utilisateur interne (recruteur, admin)
duration: 5 minutes
prerequisites:
  - être connecté à RecrutAI 2 avec un compte recruteur ou admin
  - disposer de l'email du candidat demandeur
---

# Répondre à une demande d'accès RGPD

> Tout candidat peut, sur simple demande, obtenir l'ensemble des données qui le concernent (RGPD art. 15) au format portable (RGPD art. 20). Vous avez **un mois** pour répondre.

## Étapes

1. Ouvrir RecrutAI 2 → menu latéral → **RGPD**.
2. Saisir l'email exact du candidat demandeur dans le champ « Email du candidat » et cliquer sur **Rechercher**.
3. Vérifier le nombre de candidatures trouvées : il doit correspondre aux dépôts faits par ce candidat.
4. Cliquer sur **Télécharger l'export JSON**. Un fichier `rgpd-export-<email>-<date>.json` est généré localement.
5. Le fichier contient :
   - liste des candidatures (offre, client, score, statut, analyse IA détaillée) ;
   - les liens de téléchargement signés vers les CVs (valides 1 heure — à transmettre rapidement) ;
   - la politique de rétention applicable (2 ans après dernier contact).
6. Transmettre le fichier au candidat par un canal sécurisé (idéalement le même par lequel la demande a été reçue, ex. email signé). **Ne pas transmettre ce fichier sur un canal public.**
7. Conserver une trace de la demande et de la réponse (date, demandeur, agent ayant traité). Le serveur journalise déjà l'action côté logs Vercel sous le hash de l'email.

## Points d'attention

- L'email saisi est utilisé en correspondance insensible à la casse (`ilike`). Si le candidat a déposé sous plusieurs casse différentes, toutes les candidatures sont retournées.
- Les liens de téléchargement CV expirent au bout d'1 heure. Si le candidat tarde à récupérer le fichier, relancer un export.
- Si le candidat demande **uniquement la suppression** sans copie, voir la procédure « Répondre à une demande d'effacement RGPD ».
- L'export ne contient que les données présentes dans la base RecrutAI 2. Si le candidat a échangé par email hors plateforme, ces échanges relèvent de votre messagerie professionnelle.

## En cas de problème

| Symptôme | Cause probable | Action |
|---|---|---|
| « Aucune candidature trouvée » alors que le candidat affirme en avoir | email saisi différent de celui en base | demander confirmation de l'email exact ; faire une recherche partielle dans `/applications` |
| Erreur lors de l'export | session expirée ou perte de connexion | rafraîchir la page, se reconnecter, relancer |
| Liens CV rompus dans le JSON | délai d'1 h dépassé | relancer l'export |

## Délais légaux à respecter

- Réponse sous **1 mois** maximum (RGPD art. 12.3).
- Délai prolongeable d'**2 mois supplémentaires** en cas de demande complexe ou multiple, sous réserve d'informer le demandeur dans le mois.
- Si la demande est manifestement infondée ou excessive (ex. demandes répétitives), vous pouvez refuser ou facturer — toujours motiver le refus par écrit.
