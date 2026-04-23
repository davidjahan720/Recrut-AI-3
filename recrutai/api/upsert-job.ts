/// <reference types="node" />
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { id, ...job } = req.body ?? {}
    if (!job.title?.trim()) return res.status(400).json({ error: 'title manquant' })
    if (!job.client_id) return res.status(400).json({ error: 'client_id manquant' })

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    )

    if (id) {
      const { error } = await supabase.from('jobs').update(job).eq('id', id)
      if (error) throw new Error(error.message)
      return res.json({ data: { id } })
    } else {
      const { data, error } = await supabase.from('jobs').insert(job).select('id').single()
      if (error) throw new Error(error.message)
      return res.json({ data })
    }
  } catch (err) {
    return res.status(200).json({ error: String(err) })
  }
}
