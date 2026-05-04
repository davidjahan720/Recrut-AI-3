# RecrutAI — Guide d'installation

## Prérequis
- Node.js 18+
- Compte Supabase (projet créé en région UE — Frankfurt ou Paris)
- Compte Brevo (pour les notifications email — hébergement UE, France)
- Clé API Mistral AI (https://console.mistral.ai)
- Compte GitHub + Vercel

## 1. Variables d'environnement (frontend)

Créer `.env.local` à la racine du projet :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## 2. Base de données Supabase

Dans le dashboard Supabase → SQL Editor, coller et exécuter :
```
supabase/schema.sql
```

## 3. Storage — bucket cvs

Dashboard Supabase → Storage → New bucket :
- Nom : `cvs`
- Public : **NON** (laisser privé)

Puis exécuter les policies Storage depuis `supabase/schema.sql` (section Storage).

## 4. Créer un utilisateur

Dashboard Supabase → Authentication → Users → Add user :
- Email + mot de passe de l'équipe RecrutAI

## 5. Déploiement des Edge Functions Supabase

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase functions deploy score-cv
npx supabase functions deploy parse-job
```

Puis dans Dashboard Supabase → Edge Functions → secrets de chaque fonction :

```
MISTRAL_API_KEY=...                # clé API Mistral (https://console.mistral.ai)
BREVO_API_KEY=xkeysib-...          # clé API Brevo (https://app.brevo.com/settings/keys/api)
BREVO_SENDER_EMAIL=noreply@...     # email expéditeur validé dans Brevo
BREVO_SENDER_NAME=RecrutAI         # nom affiché de l'expéditeur (optionnel)
```

> **Note de migration 2026-05** : `ANTHROPIC_API_KEY` n'est plus utilisée. Elle peut être supprimée des secrets Supabase et Vercel.

## 6. Variables d'environnement Vercel (API serverless)

Vercel → Settings → Environment Variables :

```
VITE_SUPABASE_URL          # URL projet Supabase
VITE_SUPABASE_ANON_KEY     # clé publique anon
SUPABASE_SERVICE_ROLE_KEY  # clé service-role (jamais côté client)
MISTRAL_API_KEY            # clé Mistral pour /api/parse-job et /api/parse-client
BREVO_API_KEY              # clé Brevo pour /api/rgpd action request-review (email DPO)
BREVO_SENDER_EMAIL         # email expéditeur validé dans Brevo
BREVO_SENDER_NAME          # nom affiché (optionnel, défaut "RecrutAI")
DPO_EMAIL                  # email DPO destinataire des demandes art. 22.3
APP_ROLE_PASSWORD          # mot de passe partagé Sophie/Alix (démo : "0")
```

## 7. Lancer en local

```bash
npm install
npm run dev
```

## 8. Déploiement Vercel

1. Push sur GitHub
2. Vercel → Import Project → sélectionner le repo
3. Settings → Environment Variables (cf. étape 6)
4. Redéployer
