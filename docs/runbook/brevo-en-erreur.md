---
type: runbook
title: Brevo en erreur (notifications email DPO ou client)
severity: medium
last_review: 2026-05-04
---

# Brevo en erreur

## Symptômes

- Demande `/contestation` qui aboutit côté UX (200 OK) mais le DPO ne reçoit pas l'email.
- Email `Analyse IA — <candidat> — <poste>` non reçu par le client après une qualification.
- Logs Vercel runtime sur `/api/rgpd` ou Edge Function `score-cv` :
  - `Brevo HTTP 401` / `403` / `400` / `429`
  - ou `BREVO_API_KEY non configurée — DPO non notifié par email`
  - ou champ `email_sent: false` dans le log JSON `rgpd_review_request`.

## Diagnostic (3 min)

### 1. Identifier le code HTTP retourné par Brevo

Vercel Dashboard → **Logs** → filtrer par function `/api/rgpd` (ou Edge Function `score-cv` côté Supabase). La ligne `console.error` juste avant le log JSON métier indique le code.

Sur Production, accès rapide :
<https://vercel.com/jahandavid-6384s-projects/recrutai2-app/logs>

### 2. Vérifier la présence des variables d'environnement

```bash
# côté Vercel
cd recrutai && npx vercel env ls | grep -i brevo

# côté Supabase Edge Functions
cd .. && npx supabase secrets list --project-ref qdgsansgsiulunynlrch | grep -i brevo
```

> Note : les vars de **type sensitive** (clé API) ne sont pas lisibles via `vercel env pull` — c'est normal, leur valeur n'est accessible qu'au runtime.

### 3. Vérifier la validité de la clé directement

```powershell
$h = @{ "api-key" = "<la-clé>"; "accept" = "application/json" }
Invoke-WebRequest -Uri "https://api.brevo.com/v3/account" -Headers $h -UseBasicParsing | Select StatusCode
```

- `200` → clé valide.
- `401` → clé invalide (révoquée, mal copiée, espace en trop, mauvais compte).

### 4. Vérifier la validation du sender

<https://app.brevo.com/senders> → l'adresse utilisée comme `BREVO_SENDER_EMAIL` doit être listée et marquée **Confirmed**.

## Actions correctrices

### Cas A — `Brevo HTTP 401` (clé invalide)

1. Régénérer la clé sur <https://app.brevo.com/settings/keys/api> (Generate a new API key).
2. Coller dans Vercel Dashboard → Settings → Environment Variables → Edit `BREVO_API_KEY` → Save.
3. Coller aussi dans Supabase :

   ```bash
   npx supabase secrets set "BREVO_API_KEY=<nouvelle-clé>" --project-ref qdgsansgsiulunynlrch
   ```

4. Redéployer Vercel (commit vide ou `vercel --prod`).
5. Tester : POST `/api/rgpd` action `request-review` → vérifier `email_sent: true` dans les logs.

> **Important** : ne pas utiliser le pipe PowerShell (`| npx vercel env add`) — il ajoute des newlines parasites qui font échouer l'auth Brevo. Passer **toujours** par le Dashboard pour les clés.

### Cas B — `Brevo HTTP 400` ou message « Invalid sender »

1. Aller sur <https://app.brevo.com/senders> → vérifier que l'adresse `BREVO_SENDER_EMAIL` est listée et **Confirmed**.
2. Si non listée : **Add a sender** → renseigner email + nom → Brevo envoie un email de confirmation à cette adresse → confirmer le lien.
3. Pour un envoi à grande échelle ou un domaine custom : configurer **DKIM + SPF DNS** (Domains → Authenticate this domain).

### Cas C — `Brevo HTTP 403` (compte non actif)

1. Le compte Brevo nécessite peut-être validation manuelle (lutte anti-fraude la première semaine).
2. Confirmer l'email d'inscription Brevo + remplir le formulaire de validation côté Brevo.
3. Contacter le support si bloqué : <https://help.brevo.com>.

### Cas D — `Brevo HTTP 429` (quota dépassé)

1. Plan Brevo gratuit = 300 emails/jour. Vérifier la conso : <https://app.brevo.com/usage>.
2. Si dépassé : upgrade au plan suivant ou attendre le reset (minuit UTC).

### Cas E — `BREVO_API_KEY non configurée`

1. La var n'est pas en runtime. Vérifier :
   - Dashboard Vercel : la var existe-t-elle pour Production ? Cochée pour le bon environnement ?
   - Si elle existe mais est vide (length=0) : la **re-coller** via Dashboard (Edit → coller la valeur → Save).

### Cas F — `Brevo call failed: <erreur réseau>`

1. Probable indispo Brevo : <https://status.brevo.com>.
2. Pas d'action directe — l'envoi échoue en mode best-effort, la demande utilisateur est **journalisée** dans les logs Vercel (filtrer `type=rgpd_review_request`) pour traitement manuel.

## Vérification de retour à la normale

```powershell
$body = @{
  action = "request-review"
  candidate_email = "smoke@example.com"
  requester_email = "<ton email>"
  motivation = "Smoke test runbook brevo-en-erreur, $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')."
} | ConvertTo-Json
Invoke-RestMethod -Uri "https://recrutai2-app.vercel.app/api/rgpd" -Method POST -Body $body -ContentType "application/json"
```

Puis :
- Dashboard Brevo → **Email Activity** → tu dois voir une ligne sortante < 30 s.
- Boîte mail destinataire → email reçu.
- Logs Vercel → ligne `rgpd_review_request` avec `email_sent: true`.

## Quand ouvrir un post-mortem

- Indisponibilité > 1 h pour les notifications client (T04 du registre — engagement contractuel).
- Une demande candidat art. 22.3 reçue mais non transmise au DPO (risque RGPD).
- Bug de rotation de clé qui a duré > 24 h sans alerte.
