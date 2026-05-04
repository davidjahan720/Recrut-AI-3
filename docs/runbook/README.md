# Runbooks

> **Procédures d'incident pas-à-pas.** À ouvrir quand quelque chose **ne marche plus** en prod.

Chaque runbook donne :
1. **Symptôme** observable (ce que l'utilisateur ou la supervision voit)
2. **Diagnostic** rapide (3-5 vérifications)
3. **Actions correctrices** ordonnées (de la plus sûre à la plus risquée)
4. **Vérification** de retour à la normale
5. **Suite** : déclencher un post-mortem, mettre à jour le runbook si la cause est nouvelle

## Liste

| Service | Symptôme | Runbook |
|---|---|---|
| Mistral API | Erreurs `Mistral chat HTTP 401` ou `429` en masse | [mistral-api-en-erreur.md](./mistral-api-en-erreur.md) |
| Edge Function `purge-expired` | Job pg_cron quotidien échoue ou la table grossit | [purge-bloquee.md](./purge-bloquee.md) |
| Brevo (notifications email) | DPO ou client ne reçoit pas l'email, `email_sent: false` dans les logs | [brevo-en-erreur.md](./brevo-en-erreur.md) |
| `/api/rgpd` | 500 sur les actions export/erase/rectify | [api-rgpd-500.md](./api-rgpd-500.md) (à créer) |
| Vercel | Déploiement échoué ou rollback | [vercel-incident.md](./vercel-incident.md) (à créer) |
| Supabase | Indisponibilité Auth ou Storage | [supabase-down.md](./supabase-down.md) (à créer) |

## Convention

- Nommage : `<service>-<symptome>.md` en kebab-case.
- Toujours un encart « Quand ouvrir un post-mortem » à la fin.
- Pas de boilerplate inutile : un runbook tient en 1 écran si possible.
