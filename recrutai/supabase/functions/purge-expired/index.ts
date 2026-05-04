// Edge Function — purge automatique des candidatures expirées (RGPD art. 5.1.e).
//
// Supprime toutes les `applications` créées depuis plus de 2 ans (recommandation
// CNIL pour les processus de recrutement), ainsi que leurs CVs dans Storage.
//
// Conformité :
//  - RGPD art. 5.1.e : limitation de la conservation
//  - RGPD art. 17 : droit à l'effacement (mécanisme automatique)
//  - Registre des traitements T01 : durée 2 ans après dernier contact
//
// Sécurité :
//  - endpoint protégé par un token (header X-Purge-Token = PURGE_TOKEN env)
//  - service-role Supabase côté serveur uniquement
//  - aucune PII journalisée (juste les compteurs)
//
// Déclenchement : pg_cron Supabase, quotidien à 03h00 UTC (cf. migration
// supabase/migrations/purge_expired_cron.sql).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-purge-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Rétention par défaut : 2 ans (CNIL recrutement).
// Modifiable via env RETENTION_DAYS pour les tests.
const DEFAULT_RETENTION_DAYS = 365 * 2

// Sécurité : taille max d'un lot pour éviter un timeout sur table énorme.
const BATCH_SIZE = 500

interface PurgeResult {
  started_at: string
  finished_at: string
  retention_days: number
  cutoff_date: string
  deleted_applications: number
  deleted_cvs: number
  errors: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Vérification du token de purge (anti-déclenchement non autorisé).
  const expected = Deno.env.get('PURGE_TOKEN')
  const provided = req.headers.get('x-purge-token') ?? ''
  if (!expected) {
    console.error('PURGE_TOKEN non configurée')
    return new Response(JSON.stringify({ error: 'Configuration serveur manquante' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (provided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const startedAt = new Date()
  const retentionDays = Number(Deno.env.get('RETENTION_DAYS') ?? DEFAULT_RETENTION_DAYS)
  const cutoff = new Date(startedAt.getTime() - retentionDays * 86_400_000)
  const cutoffIso = cutoff.toISOString()

  const result: PurgeResult = {
    started_at: startedAt.toISOString(),
    finished_at: '',
    retention_days: retentionDays,
    cutoff_date: cutoffIso,
    deleted_applications: 0,
    deleted_cvs: 0,
    errors: 0,
  }

  try {
    // Itération par lots pour ne pas saturer la mémoire / timeout.
    while (true) {
      const { data: batch, error: selErr } = await supabase
        .from('applications')
        .select('id, cv_file_path')
        .lt('created_at', cutoffIso)
        .limit(BATCH_SIZE)
      if (selErr) throw new Error(`select: ${selErr.message}`)
      if (!batch || batch.length === 0) break

      const ids = batch.map(a => a.id as string)
      const paths = batch
        .map(a => a.cv_file_path as string | null)
        .filter((p): p is string => !!p && !p.startsWith('seed/'))

      // Suppression DB
      const { error: delErr } = await supabase.from('applications').delete().in('id', ids)
      if (delErr) {
        result.errors++
        console.error(`db delete batch: ${delErr.message}`)
        break
      }
      result.deleted_applications += ids.length

      // Suppression Storage (best effort, par chunks de 1000)
      for (let i = 0; i < paths.length; i += 1000) {
        const slice = paths.slice(i, i + 1000)
        const { error: storageErr } = await supabase.storage.from('cvs').remove(slice)
        if (storageErr) {
          result.errors++
          console.error(`storage delete batch: ${storageErr.message}`)
        } else {
          result.deleted_cvs += slice.length
        }
      }

      if (batch.length < BATCH_SIZE) break
    }
  } catch (err) {
    result.errors++
    console.error('purge-expired error:', err instanceof Error ? err.message : 'unknown')
  } finally {
    result.finished_at = new Date().toISOString()
    // Log structuré JSON, sans aucune PII.
    console.log(JSON.stringify({ type: 'rgpd_purge', ...result }))
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
