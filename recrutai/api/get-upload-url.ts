/// <reference types="node" />
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { path } = req.body ?? {}
    if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path requis' })

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    )

    const { data, error } = await supabase.storage.from('cvs').createSignedUploadUrl(path)
    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Erreur signed URL' })

    return res.json({ token: data.token, path: data.path })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
