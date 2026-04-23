/// <reference types="node" />
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids manquant' })

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    )

    const { error } = await supabase.from('clients').delete().in('id', ids)
    if (error) throw new Error(error.message)
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
