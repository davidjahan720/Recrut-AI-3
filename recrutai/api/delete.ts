/// <reference types="node" />

// Endpoint unique de suppression — consolidation de delete-application,
// delete-client, delete-job pour respecter la limite de 12 fonctions Vercel
// Hobby.
//
// Body : { entity: 'application' | 'client' | 'job', ids: string[], paths?: string[] }
// Pour "application", paths désigne les fichiers Storage à purger en plus.

import { createClient } from '@supabase/supabase-js'

type Entity = 'application' | 'client' | 'job'

const TABLE_BY_ENTITY: Record<Entity, string> = {
  application: 'applications',
  client: 'clients',
  job: 'jobs',
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { entity, ids, paths } = req.body ?? {}
    if (entity !== 'application' && entity !== 'client' && entity !== 'job') {
      return res.status(400).json({ error: 'entity invalide (application | client | job)' })
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids manquant' })
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    )

    const table = TABLE_BY_ENTITY[entity as Entity]
    const { error: dbErr } = await supabase.from(table).delete().in('id', ids)
    if (dbErr) throw new Error(dbErr.message)

    // Suppression des fichiers Storage uniquement pour les candidatures.
    if (entity === 'application' && Array.isArray(paths) && paths.length > 0) {
      await supabase.storage.from('cvs').remove(paths)
    }

    return res.json({ ok: true })
  } catch (err) {
    // RGPD : message générique côté client
    const message = err instanceof Error ? err.message : 'Erreur'
    console.error('delete:', message)
    return res.status(500).json({ error: 'Suppression impossible' })
  }
}
