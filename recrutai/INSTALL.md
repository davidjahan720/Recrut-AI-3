# RecrutAI — Guide d'installation

## Prérequis
- Node.js 18+
- Compte Supabase (projet créé)
- Compte Resend
- Clé API Anthropic
- Compte GitHub + Vercel

## 1. Variables d'environnement

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

## 5. Déploiement de l'Edge Function

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase functions deploy score-cv
```

Puis dans Dashboard Supabase → Edge Functions → score-cv → Secrets :
```
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
SYSTEM_PROMPT=Tu es un expert en recrutement. Analyse le CV fourni par rapport à la description du poste. Retourne UNIQUEMENT un objet JSON valide avec : {"score": <0-100>, "justification": "<2-3 phrases>", "candidate_name": "<nom ou null>", "candidate_email": "<email ou null>"}
```

## 6. Lancer en local

```bash
npm install
npm run dev
```

## 7. Déploiement Vercel

1. Push sur GitHub
2. Vercel → Import Project → sélectionner le repo
3. Settings → Environment Variables → ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
4. Redéployer
