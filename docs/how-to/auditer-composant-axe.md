---
type: how-to
title: Auditer manuellement un composant avec axe DevTools
audience: développeur
duration: 10 minutes
prerequisites:
  - extension axe DevTools installée (Chrome / Firefox)
  - un build local lancé avec `npm run dev`
---

# Auditer manuellement un composant avec axe DevTools

> Le pipeline CI lance `axe-core` en mode automatique, mais ne couvre que ~30 % des critères RGAA. Pour un audit complet d'un composant ou d'une page, l'extension axe DevTools fait un balayage plus poussé et signale les éléments à vérifier manuellement.

## Étapes

1. Lancer le serveur local : `npm run dev` depuis `recrutai/`.
2. Ouvrir l'URL ciblée dans Chrome ou Firefox.
3. Ouvrir les DevTools (F12) → onglet **axe DevTools**.
4. Cliquer sur **Scan ALL of my page**.
5. Lire le rapport :
   - **Critical / Serious** : à fixer **avant merge** (équivalent CI bloquant).
   - **Moderate / Minor** : à fixer dans une itération suivante, à noter dans la PR.
   - **Best practice** : recommandation, pas obligation RGAA.
6. Pour chaque violation, cliquer sur **Highlight** : axe surligne l'élément en page. **Inspect** ouvre l'arbre DOM directement sur le nœud incriminé.
7. Cliquer sur **Learn more** pour la doc Deque (avec exemple correct + critère WCAG/RGAA cité).

## Audit ciblé d'un composant

Au lieu de scanner la page entière :

1. Dans l'inspecteur DOM, sélectionner l'élément racine du composant (ex. la `<section>` ou la `<dialog>`).
2. Onglet axe DevTools → **More options** → **Scan only this section**.

## Tester l'accessibilité au clavier

axe ne détecte pas l'usage clavier. À faire en complément :

1. Cliquer dans la barre d'adresse pour défocaliser.
2. Tapoter `Tab` → vérifier que le focus visite tous les éléments interactifs **dans un ordre logique** (haut→bas, gauche→droite).
3. Vérifier le **focus visible** sur chaque élément : pas de `outline: none` sans alternative.
4. Sur un bouton, vérifier que `Espace` ou `Entrée` déclenche l'action.
5. Sur une boîte de dialogue, vérifier `Échap` la ferme et que le focus est restauré sur l'élément qui l'a ouverte.

## Tester avec un lecteur d'écran

- **Windows** : NVDA (gratuit, https://www.nvaccess.org/).
- **macOS** : VoiceOver (Cmd+F5 pour activer).
- **Linux** : Orca.

Lancer le lecteur, désactiver le son de la souris, et naviguer **uniquement au clavier**. Le contenu doit être audible et compréhensible dans l'ordre logique.

## Quand ouvrir un ticket RGAA

- Toute violation `serious` ou `critical` non corrigée immédiatement.
- Toute incohérence entre ce que dit axe et ce que constate le lecteur d'écran.
- Tout retour utilisateur en situation de handicap.

Référencer le critère RGAA précis (ex. « RGAA 11.1 — chaque champ de formulaire est-il correctement étiqueté ? ») dans le titre du ticket.

## Documentation officielle

- Référentiel RGAA 4.1 : https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/
- Liste des critères : https://design.numerique.gouv.fr/outils/audit-rgaa/
- Articles WCAG : https://www.w3.org/WAI/WCAG21/quickref/
