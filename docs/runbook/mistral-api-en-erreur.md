---
type: runbook
title: Mistral API en erreur (analyse CV / parsing)
severity: high
last_review: 2026-05-04
---

# Mistral API en erreur

## Symptômes

- Pages `/jobs` ou `/applications` : nouvelles candidatures bloquées en `status='error'` avec justification `Mistral chat HTTP <code>` ou `Mistral OCR HTTP <code>`.
- Sentry : pic d'erreurs `Mistral chat HTTP 401|429|5xx`.
- Vercel logs `/api/parse-job` ou `/api/parse-client` : 500 récurrents.

## Diagnostic (5 min)

1. **Status Mistral** : <https://status.mistral.ai> — incident en cours côté fournisseur ?
2. **Validité de la clé** :

   ```powershell
   $h = @{ Authorization = "Bearer <NOUVELLE_CLE>" }
   Invoke-WebRequest -Uri "https://api.mistral.ai/v1/models" -Headers $h -UseBasicParsing
   ```

   - `200` → clé OK, problème côté nous.
   - `401` → clé révoquée ou expirée.
   - `429` → quota dépassé.
3. **Quota / facturation** : <https://console.mistral.ai> → Billing.
4. **Synchronisation Vercel ↔ Supabase secrets** :

   ```bash
   npx vercel env ls | grep MISTRAL_API_KEY
   npx supabase secrets list --project-ref qdgsansgsiulunynlrch | grep MISTRAL_API_KEY
   ```

   Les digests doivent correspondre (signe que c'est la même clé partout).

## Actions correctrices

### Cas A — Clé révoquée / expirée (HTTP 401)

1. Console Mistral → API Keys → générer une nouvelle clé.
2. Pousser sur Vercel + Supabase :

   ```powershell
   $NEW = "<nouvelle_cle>"  # remplace ici
   npx vercel env rm MISTRAL_API_KEY production --yes
   "MISTRAL_API_KEY=$NEW" | npx vercel env add MISTRAL_API_KEY production
   npx supabase secrets set "MISTRAL_API_KEY=$NEW" --project-ref qdgsansgsiulunynlrch
   npx vercel --prod --yes
   ```

3. Tester `/api/parse-job` avec un PDF bidon → doit retourner `Mistral OCR HTTP 400` (= clé valide, payload bidon rejeté).
4. Re-traiter manuellement les candidatures en erreur (action « Re-scorer » à venir, ou suppression + re-upload).

### Cas B — Quota dépassé (HTTP 429)

1. Augmenter le quota dans la console Mistral (paiement à la consommation).
2. Si pas urgent : laisser la rate limiter de Mistral désamorcer (~ 1 min).
3. Implémenter un **retry exponentiel** côté `score-cv` Edge Function (TODO si récurrent).

### Cas C — Indisponibilité Mistral (HTTP 5xx)

1. Pas d'action côté nous.
2. Communiquer aux clients qu'un retard de scoring est possible (les CVs restent en `status='pending'`).
3. Quand Mistral revient : un re-déclenchement manuel via SQL est nécessaire (TODO : ajouter un job de re-scoring des `pending`).

## Vérification de retour à la normale

```bash
# Smoke test bout-en-bout
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://recrutai2-app.vercel.app/api/parse-job" \
  -H "Content-Type: application/json" \
  -d '{"pdf_base64":"JVBERi0xLjQK"}'
# Attendu : "Mistral OCR HTTP 400" dans le corps (et HTTP 200 côté HTTP).
```

## Quand ouvrir un post-mortem

- **Toujours** si la durée d'indisponibilité > 30 min ou si > 10 candidatures en erreur.
- Toujours si la cause n'est pas listée ci-dessus.
- Mettre à jour ce runbook avec la nouvelle cause / action.
