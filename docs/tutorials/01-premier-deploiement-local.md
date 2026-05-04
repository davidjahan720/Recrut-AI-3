---
type: tutorial
title: Premier déploiement RecrutAI 2 en local
audience: nouveau contributeur (dev / DPO / chef de projet)
duration: 30 minutes
---

# Premier déploiement RecrutAI 2 en local

> À la fin de ce tutoriel, vous aurez RecrutAI 2 qui tourne sur votre machine, connecté à un projet Supabase et capable de scorer un CV.

## Prérequis

- **Node.js 20+** : `node --version` doit retourner `v20.x.x` ou plus.
- **Git** : `git --version`.
- **Compte Supabase** (gratuit) : <https://supabase.com>.
- **Compte Mistral** : <https://console.mistral.ai> — pour la clé API.
- **Compte Vercel** (optionnel pour le déploiement final) : <https://vercel.com>.

## 1. Cloner le dépôt

```bash
git clone https://github.com/davidjahan720/Recrut-AI-3.git
cd Recrut-AI-3
```

Vous devriez voir les dossiers `recrutai/`, `supabase/`, `docs/`.

## 2. Installer les dépendances

```bash
cd recrutai
npm install
```

Cela installe React 19, Vite, TailwindCSS, Supabase client, Playwright (tests), Lighthouse CI, ESLint + plugins, etc. Compter ~300 Mo dans `node_modules/`.

**Vérification** :

```bash
npm run typecheck
# → 0 erreurs attendu
```

## 3. Créer un projet Supabase

1. <https://supabase.com/dashboard> → New Project.
2. Choisir **région UE** (Frankfurt ou Ireland) — important pour la conformité RGPD.
3. Définir un mot de passe DB (à conserver dans votre coffre-fort).
4. Attendre la fin du provisionnement (~2 min).

## 4. Appliquer le schéma de base

Dans le Dashboard Supabase → SQL Editor, copier-coller le contenu de `supabase/schema.sql` puis Run. Cela crée les tables `clients`, `jobs`, `applications`.

## 5. Configurer les variables d'environnement

Créer `recrutai/.env.local` :

```
VITE_SUPABASE_URL=https://<votre-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Récupérer ces valeurs dans **Dashboard Supabase → Project Settings → API**.

## 6. Lancer le serveur de développement

```bash
npm run dev
```

Vite démarre Vite sur <http://localhost:5173/>. Ouvrir cette URL dans le navigateur.

**Vérification** : la page d'accueil RecrutAI s'affiche, on voit le bandeau « Propulsé par Mistral AI — IA souveraine européenne ».

## 7. Tester sans backend complet (mode démo)

À ce stade, l'analyse IA ne marche pas (pas de clé Mistral configurée côté serveur). Pour tester un parcours complet :

1. Aller sur `/login`.
2. Se connecter avec :
   - Email : `sophie@recrutai.fr`
   - Mot de passe : `0` (par défaut en démo)
3. Naviguer dans les écrans `/manager`, `/jobs`, `/clients`, `/rgpd`.

> Le scoring effectif demande la configuration des Edge Functions Supabase et des secrets `MISTRAL_API_KEY` — voir [`/docs/how-to/configurer-purge-automatique.md`](../how-to/configurer-purge-automatique.md) pour la même logique appliquée à la purge.

## 8. Lancer les tests

```bash
# Tests unitaires (Vitest)
npm run test:unit

# Lint avec règles a11y
npm run lint
```

Tous les tests doivent passer.

## 9. Construire pour la production

```bash
npm run build
```

Le bundle final est dans `recrutai/dist/`. Le bundle JS initial doit faire **moins de 250 KiB gzippé** — c'est notre budget RGESN. Vérifier :

```bash
ls -la dist/assets/index-*.js
```

## Prochaines étapes

- [Configurer la purge automatique RGPD](../how-to/configurer-purge-automatique.md)
- [Comprendre la stratégie de conformité](../explanation/strategie-conformite.md)
- [Lire le registre des traitements](../reference/registre-traitements.md)

## En cas de problème

| Symptôme | Action |
|---|---|
| `npm install` échoue | Vérifier `node --version` ≥ 20. |
| Page blanche sur localhost:5173 | Ouvrir la console navigateur (F12) ; chercher l'erreur. Souvent une variable `.env.local` mal renseignée. |
| `npm run typecheck` plante | Supprimer `node_modules` + `package-lock.json`, refaire `npm install`. |
