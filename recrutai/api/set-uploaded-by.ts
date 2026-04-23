/// <reference types="node" />
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { cv_file_path, job_id, uploaded_by } = req.body
    if (!cv_file_path || !job_id || !uploaded_by)
      return res.status(400).json({ error: 'Paramètres manquants' })

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    )

    await supabase
      .from('applications')
      .update({ uploaded_by })
      .eq('job_id', job_id)
      .eq('cv_file_path', cv_file_path)

    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
