# RecrutAI 2

> Plateforme de qualification de candidatures assistée par IA, pour cabinets de recrutement.
> Conformité **RGPD / RGAA AA / RGESN** par construction.

[![Conformité](https://github.com/davidjahan720/Recrut-AI-3/actions/workflows/conformite.yml/badge.svg)](https://github.com/davidjahan720/Recrut-AI-3/actions/workflows/conformite.yml)
[![Production](https://img.shields.io/badge/prod-recrutai2--app.vercel.app-violet)](https://recrutai2-app.vercel.app)

## Pour qui

- **Recruteurs / managers** d'un cabinet : gérez vos clients, offres, CVs et candidatures.
- **Candidats** : faites valoir vos droits via [`/contestation`](https://recrutai2-app.vercel.app/contestation) (examen humain RGPD art. 22.3) ou contactez `contact@recrutai.fr` (accès, rectification, effacement).

## Stack

| Couche | Choix |
|---|---|
| Frontend | React 19, Vite, TypeScript, TailwindCSS, shadcn/ui, react-router 7 |
| Backend | Vercel Serverless Functions (Node 20), Supabase Edge Functions (Deno) |
| Base de données | Supabase Postgres (région UE — Ireland) |
| Stockage | Supabase Storage privé (bucket `cvs`) |
| IA | **Mistral AI** (France, UE) — `mistral-large-latest` + `mistral-ocr-latest` |
| Email | Resend (UE/US sous DPF) |
| Auth | Supabase Auth (admin) + sessions rôle (recruteurs) |
| CI/CD | GitHub Actions, Vercel CLI, Supabase CLI |

## Démarrage rapide

Voir le tutoriel pas-à-pas : [`docs/tutorials/01-premier-deploiement-local.md`](./docs/tutorials/01-premier-deploiement-local.md).

```bash
git clone https://github.com/davidjahan720/Recrut-AI-3.git
cd Recrut-AI-3/recrutai
npm install
cp .env.example .env.local  # à remplir avec vos clés Supabase
npm run dev
```

## Documentation

Tout est dans [`docs/`](./docs/) (cadre Diátaxis étendu) :

- 🎓 [**Tutorial**](./docs/tutorials/) — apprendre en faisant
- 📋 [**How-to**](./docs/how-to/) — recettes pour tâches précises (RGPD, accessibilité)
- 💡 [**Explanation**](./docs/explanation/) — comprendre les choix (AIPD, stratégie conformité)
- 📚 [**Reference**](./docs/reference/) — registre des traitements, déclaration d'accessibilité
- 🏛 [**ADR**](./docs/adr/) — décisions d'architecture
- 🚨 [**Runbook**](./docs/runbook/) — quoi faire si ça pète
- 🔍 [**Post-mortem**](./docs/post-mortem/) — RETEX d'incidents
- 📊 [**Monitoring**](./docs/monitoring/) — est-ce que ça va ?
- 🔭 [**Observability**](./docs/observability/) — pourquoi ça se comporte comme ça ?

## Conformité

| Cadre | Niveau | Artefact auditable |
|---|---|---|
| RGPD | art. 5, 15-17, 22, 28, 30, 33-34, 35 couverts | [Registre des traitements](./docs/reference/registre-traitements.md), [AIPD T01](./docs/explanation/aipd-scoring-cv.md) |
| RGAA 4.1 | AA (partielle) | [Déclaration d'accessibilité](./docs/reference/declaration-accessibilite.md), tests axe-core en CI sur 13 routes |
| RGESN 1.1 | budget bundle ≤ 250 KiB gzip, Lighthouse Web Vitals bloquants | Workflow CI |
| Sécurité | gitleaks, hash SHA-256 PII en logs, TLS 1.3 partout | Workflow CI |

## Hébergement (UE)

- **Frontend + Vercel Functions** : Vercel, region `iad1` mais alias `cdg1` pour les utilisateurs UE
- **Base + Storage** : Supabase, region `eu-west-1` (Ireland)
- **IA** : Mistral AI, France
- **Email** : Resend, UE/US sous DPF

## Production

- URL : <https://recrutai2-app.vercel.app>
- Branche : `refonte-app` (la branche par défaut va être promue après validation)
- Pipeline CI : <https://github.com/davidjahan720/Recrut-AI-3/actions>

## Contribution

1. Toute modification fonctionnelle qui touche à la conformité doit mettre à jour la doc associée **dans la même PR** (definition of done).
2. Pas de PII dans les logs — règle absolue, vérifiée par revue.
3. Conventional Commits (`feat:`, `fix:`, `docs:`, `ci:`, `refactor:`, `test:`).
4. Pipeline CI bloquant : 0 erreur lint, 0 violation a11y `serious`/`critical`, build sous budget, secrets propres.

## Licence

Propriétaire — © 2026 RecrutAI / David Jahan.

## Contact

- DPO : `contact@recrutai.fr`
- Issues techniques : <https://github.com/davidjahan720/Recrut-AI-3/issues>
