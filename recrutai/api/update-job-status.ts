/// <reference types="node" />
import { createClient } from '@supabase/supabase-js'

const VALID_STATUSES = ['active', 'inactive', 'closed']

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { id, status } = req.body ?? {}
    if (!id) return res.status(400).json({ error: 'id manquant' })
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'status invalide' })

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    )

    const { error } = await supabase.from('jobs').update({ status }).eq('id', id)
    if (error) throw new Error(error.message)
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
