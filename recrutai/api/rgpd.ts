/// <reference types="node" />

// Endpoint unique RGPD — droits art. 15-17.
//
// Dispatch par champ `action` dans le body :
//   - "export"  : art. 15 + 20 (accès + portabilité)
//   - "erase"   : art. 17 (droit à l'effacement)
//   - "rectify" : art. 16 (rectification)
//
// Endpoint unifié pour respecter la limite de 12 fonctions Vercel Hobby.
//
// Sécurité :
//  - actor obligatoire (header X-Actor ou body.actor) — journalisé.
//  - service-role Supabase côté serveur uniquement.
//  - chaque action logge l'événement (qui, quoi, quand) via un hash de la
//    cible, sans persister la PII candidat.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

export const config = { maxDuration: 30 }

type Action = 'export' | 'erase' | 'rectify'

// ─── Helpers (inlinés pour éviter les soucis de bundling Vercel) ──────────

interface ActorIdentity {
  id: string
  ip: string | null
}

function getActor(req: any): ActorIdentity | null {
  const raw = req.headers?.['x-actor'] ?? req.body?.actor
  const id = typeof raw === 'string' ? raw.trim() : ''
  if (!id) return null
  const ip = (req.headers?.['x-forwarded-for'] ?? '').toString().split(',')[0]?.trim() || null
  return { id, ip }
}

function getServerSupabase(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables Supabase serveur manquantes')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function isValidEmail(s: unknown): s is string {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()) && s.length < 255
}

// Hash court non réversible pour identifier un candidat dans les logs
// sans exposer son email (RGPD : minimisation des journaux).
function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16)
}

function logRgpdAction(
  action: Action,
  actor: ActorIdentity,
  targetHash: string,
  result: 'success' | 'error',
  detail?: string,
): void {
  console.log(JSON.stringify({
    type: 'rgpd_action',
    ts: new Date().toISOString(),
    action,
    actor: actor.id,
    actor_ip: actor.ip,
    target_hash: targetHash,
    result,
    detail: detail ? detail.slice(0, 120) : undefined,
  }))
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const actor = getActor(req)
  if (!actor) return res.status(401).json({ error: 'Authentification requise' })

  const action = req.body?.action as Action | undefined
  if (action !== 'export' && action !== 'erase' && action !== 'rectify') {
    return res.status(400).json({ error: 'action invalide (export | erase | rectify)' })
  }

  try {
    if (action === 'export') return await handleExport(req, res, actor)
    if (action === 'erase') return await handleErase(req, res, actor)
    return await handleRectify(req, res, actor)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur'
    // RGPD : message générique côté client, détail côté serveur
    console.error('rgpd dispatch:', message)
    return res.status(500).json({ error: 'Erreur serveur RGPD' })
  }
}

// ─── Export — art. 15 + 20 ───────────────────────────────────────────────

async function handleExport(req: any, res: any, actor: ReturnType<typeof getActor> & object) {
  const { candidate_email } = req.body ?? {}
  if (!isValidEmail(candidate_email)) {
    return res.status(400).json({ error: 'candidate_email invalide' })
  }
  const email = candidate_email.trim().toLowerCase()
  const targetHash = hashEmail(email)

  try {
    const supabase = getServerSupabase()
    const { data: applications, error: appsErr } = await supabase
      .from('applications')
      .select(`
        id, job_id, cv_file_path, candidate_name, candidate_email,
        score, status, justification, positive_points, negative_points,
        cv_sector, email_sent_at, uploaded_by, created_at,
        jobs (title, location, contract_type, score_threshold, clients (name))
      `)
      .ilike('candidate_email', email)
      .order('created_at', { ascending: false })
    if (appsErr) throw new Error(appsErr.message)

    const expiresAt = new Date(Date.now() + 3_600_000).toISOString()
    const cvLinks: { application_id: string; download_url: string | null; expires_at: string }[] = []
    for (const app of applications ?? []) {
      if (!app.cv_file_path) {
        cvLinks.push({ application_id: app.id, download_url: null, expires_at: expiresAt })
        continue
      }
      const { data: signed } = await supabase.storage.from('cvs').createSignedUrl(app.cv_file_path, 3600)
      cvLinks.push({ application_id: app.id, download_url: signed?.signedUrl ?? null, expires_at: expiresAt })
    }

    const payload = {
      generated_at: new Date().toISOString(),
      generated_by: actor.id,
      candidate_email: email,
      applications_count: applications?.length ?? 0,
      applications: (applications ?? []).map(a => ({
        id: a.id,
        created_at: a.created_at,
        job: a.jobs ? {
          title: (a.jobs as any).title,
          location: (a.jobs as any).location,
          contract_type: (a.jobs as any).contract_type,
          client_name: (a.jobs as any).clients?.name ?? null,
        } : null,
        candidate: {
          name: a.candidate_name,
          email: a.candidate_email,
          sector: a.cv_sector,
        },
        analysis: {
          score: a.score,
          status: a.status,
          justification: a.justification,
          positive_points: a.positive_points ? safeParseArray(a.positive_points) : [],
          negative_points: a.negative_points ? safeParseArray(a.negative_points) : [],
        },
        notification_sent_at: a.email_sent_at,
        uploaded_by: a.uploaded_by,
      })),
      cv_downloads: cvLinks,
      retention_policy: 'CV et analyses conservés 2 ans après le dernier contact (recommandation CNIL).',
      contact_dpo: 'contact@recrutai.fr',
    }
    logRgpdAction('export', actor, targetHash, 'success', `${payload.applications_count} candidatures`)
    return res.status(200).json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur'
    logRgpdAction('export', actor, targetHash, 'error', message)
    return res.status(500).json({ error: 'Erreur lors de l\'export RGPD' })
  }
}

// ─── Erase — art. 17 ──────────────────────────────────────────────────────

async function handleErase(req: any, res: any, actor: ReturnType<typeof getActor> & object) {
  const { candidate_email, confirm } = req.body ?? {}
  if (!isValidEmail(candidate_email)) {
    return res.status(400).json({ error: 'candidate_email invalide' })
  }
  if (confirm !== true) {
    return res.status(400).json({ error: 'Confirmation requise (champ "confirm": true)' })
  }
  const email = candidate_email.trim().toLowerCase()
  const targetHash = hashEmail(email)

  try {
    const supabase = getServerSupabase()
    const { data: apps, error: selErr } = await supabase
      .from('applications')
      .select('id, cv_file_path')
      .ilike('candidate_email', email)
    if (selErr) throw new Error(selErr.message)

    const ids = (apps ?? []).map(a => a.id as string)
    const paths = (apps ?? [])
      .map(a => a.cv_file_path as string | null)
      .filter((p): p is string => !!p && !p.startsWith('seed/'))

    if (ids.length === 0) {
      logRgpdAction('erase', actor, targetHash, 'success', 'aucune candidature trouvée')
      return res.status(200).json({
        deleted_applications: 0,
        deleted_cvs: 0,
        message: 'Aucune donnée à effacer pour cet email.',
      })
    }

    const { error: delErr } = await supabase.from('applications').delete().in('id', ids)
    if (delErr) throw new Error(delErr.message)

    let deletedCvs = 0
    if (paths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('cvs').remove(paths)
      if (storageErr) {
        logRgpdAction('erase', actor, targetHash, 'error', 'storage: ' + storageErr.message)
      } else {
        deletedCvs = paths.length
      }
    }

    logRgpdAction('erase', actor, targetHash, 'success', `${ids.length} apps + ${deletedCvs} CVs`)
    return res.status(200).json({
      deleted_applications: ids.length,
      deleted_cvs: deletedCvs,
      message: 'Effacement effectué.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur'
    logRgpdAction('erase', actor, targetHash, 'error', message)
    return res.status(500).json({ error: 'Erreur lors de l\'effacement RGPD' })
  }
}

// ─── Rectify — art. 16 ────────────────────────────────────────────────────

async function handleRectify(req: any, res: any, actor: ReturnType<typeof getActor> & object) {
  const { application_id, target_email, new_candidate_name, new_candidate_email } = req.body ?? {}

  const hasTarget = (typeof application_id === 'string' && application_id.length > 0)
                 || isValidEmail(target_email)
  if (!hasTarget) {
    return res.status(400).json({ error: 'Cible requise : application_id ou target_email' })
  }

  const wantsNewName = typeof new_candidate_name === 'string' && new_candidate_name.trim().length > 0
  const wantsNewEmail = typeof new_candidate_email === 'string' && isValidEmail(new_candidate_email)
  if (!wantsNewName && !wantsNewEmail) {
    return res.status(400).json({ error: 'Aucune modification demandée' })
  }

  const update: Record<string, string> = {}
  if (wantsNewName) update.candidate_name = (new_candidate_name as string).trim()
  if (wantsNewEmail) update.candidate_email = (new_candidate_email as string).trim().toLowerCase()

  const targetForHash = (typeof target_email === 'string' && target_email)
    || (typeof application_id === 'string' && application_id)
    || ''
  const targetHash = hashEmail(String(targetForHash))

  try {
    const supabase = getServerSupabase()
    const query = supabase.from('applications').update(update)
    const { data, error } = application_id
      ? await query.eq('id', application_id).select('id')
      : await query.ilike('candidate_email', String(target_email).trim().toLowerCase()).select('id')

    if (error) throw new Error(error.message)

    const updated = (data ?? []).length
    logRgpdAction('rectify', actor, targetHash, 'success', `${updated} candidatures rectifiées`)

    return res.status(200).json({
      updated_applications: updated,
      fields: Object.keys(update),
      message: updated > 0 ? 'Rectification effectuée.' : 'Aucune candidature trouvée pour cette cible.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur'
    logRgpdAction('rectify', actor, targetHash, 'error', message)
    return res.status(500).json({ error: 'Erreur lors de la rectification RGPD' })
  }
}

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
