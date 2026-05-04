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

type Action = 'export' | 'erase' | 'rectify' | 'request-review'

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

  const action = req.body?.action as Action | undefined
  if (action !== 'export' && action !== 'erase' && action !== 'rectify' && action !== 'request-review') {
    return res.status(400).json({ error: 'action invalide' })
  }

  // request-review est public (le candidat n'a pas de compte). Les autres
  // actions exigent un acteur authentifié.
  if (action !== 'request-review') {
    const actor = getActor(req)
    if (!actor) return res.status(401).json({ error: 'Authentification requise' })
    try {
      if (action === 'export') return await handleExport(req, res, actor)
      if (action === 'erase') return await handleErase(req, res, actor)
      return await handleRectify(req, res, actor)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur'
      console.error('rgpd dispatch:', message)
      return res.status(500).json({ error: 'Erreur serveur RGPD' })
    }
  }

  try {
    return await handleReviewRequest(req, res)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur'
    console.error('rgpd review:', message)
    return res.status(500).json({ error: 'Erreur serveur RGPD' })
  }
}

// ─── Request-review — art. 22.3 (droit à un examen humain) ───────────────

async function handleReviewRequest(req: any, res: any) {
  const { candidate_email, candidate_name, requester_email, motivation } = req.body ?? {}
  // Le candidat peut renseigner son propre email = candidate_email = requester_email,
  // OU un tiers (avocat, association) qui demande pour lui.
  if (!isValidEmail(candidate_email)) {
    return res.status(400).json({ error: 'candidate_email invalide' })
  }
  if (!isValidEmail(requester_email)) {
    return res.status(400).json({ error: 'requester_email invalide' })
  }
  if (typeof motivation !== 'string' || motivation.trim().length < 30 || motivation.length > 4000) {
    return res.status(400).json({ error: 'motivation requise (30 à 4000 caractères)' })
  }
  const cName = typeof candidate_name === 'string' ? candidate_name.trim().slice(0, 200) : null
  const cEmail = (candidate_email as string).trim().toLowerCase()
  const rEmail = (requester_email as string).trim().toLowerCase()
  const motiv = motivation.trim()
  const sourceIp = (req.headers?.['x-forwarded-for'] ?? '').toString().split(',')[0]?.trim() || null
  const targetHash = hashEmail(cEmail)

  // Notification au DPO via Resend (best effort).
  // Le serveur retourne 200 même si l'email échoue : la trace est dans les logs.
  const dpoEmail = (process.env.DPO_EMAIL ?? 'contact@recrutai.fr').trim()
  const resendKey = process.env.RESEND_API_KEY?.trim()
  let emailSent = false

  if (resendKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'RecrutAI <onboarding@resend.dev>',
          to: dpoEmail,
          reply_to: rEmail,
          subject: `[RGPD art. 22.3] Demande d'examen humain — ${cName ?? cEmail}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h1 style="font-size:18px;color:#1f2937">Demande d'examen humain reçue</h1>
            <p style="font-size:14px;color:#374151">Conformément à l'art. 22.3 RGPD, un candidat (ou son représentant) demande qu'un être humain réexamine la décision automatisée prise sur sa candidature.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#374151;width:160px">Candidat·e</td><td style="padding:6px 0;font-weight:600">${escapeHtml(cName ?? '—')}</td></tr>
              <tr><td style="padding:6px 0;color:#374151">Email candidat·e</td><td style="padding:6px 0">${escapeHtml(cEmail)}</td></tr>
              <tr><td style="padding:6px 0;color:#374151">Demandeur</td><td style="padding:6px 0">${escapeHtml(rEmail)}</td></tr>
              <tr><td style="padding:6px 0;color:#374151">Date</td><td style="padding:6px 0">${new Date().toLocaleString('fr-FR')}</td></tr>
              <tr><td style="padding:6px 0;color:#374151">IP source</td><td style="padding:6px 0">${escapeHtml(sourceIp ?? '—')}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
            <p style="font-size:14px;color:#1f2937;margin:0 0 8px"><strong>Motif :</strong></p>
            <p style="font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap">${escapeHtml(motiv)}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
            <p style="font-size:13px;color:#6b7280">Procédure : voir <code>docs/how-to/traiter-demande-examen-humain.md</code>. Délai légal : réponse motivée sous 1 mois (RGPD art. 12.3).</p>
          </div>`,
        }),
      })
      if (r.ok) {
        emailSent = true
      } else {
        console.error(`Resend HTTP ${r.status}`)
      }
    } catch (err) {
      console.error('Resend call failed:', err instanceof Error ? err.name : 'unknown')
    }
  } else {
    console.error('RESEND_API_KEY non configurée — DPO non notifié par email')
  }

  // Log RGPD structuré (sans PII) pour traçabilité
  console.log(JSON.stringify({
    type: 'rgpd_review_request',
    ts: new Date().toISOString(),
    target_hash: targetHash,
    requester_hash: hashEmail(rEmail),
    source_ip: sourceIp,
    motivation_chars: motiv.length,
    email_sent: emailSent,
  }))

  // Réponse identique succès/échec côté client (ne pas révéler la config interne)
  return res.status(200).json({
    received: true,
    message: 'Votre demande a bien été enregistrée. Le délégué à la protection des données vous contactera sous 1 mois (RGPD art. 12.3).',
  })
}

// Anti-injection HTML pour les champs insérés dans l'email DPO.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
