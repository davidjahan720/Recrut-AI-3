/// <reference types="node" />
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { p_name, p_contact_name, p_contact_email, p_notification_email, p_sector, p_id } = req.body
    if (!p_name?.trim()) return res.status(400).json({ error: 'p_name manquant' })

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    )

    const { data, error } = await supabase.rpc('upsert_client', {
      p_name: p_name.trim(),
      p_contact_name: p_contact_name ?? '',
      p_contact_email: p_contact_email ?? '',
      p_notification_email: p_notification_email ?? '',
      p_sector: p_sector ?? '',
      ...(p_id ? { p_id } : {}),
    })
    if (error) throw new Error(error.message)
    return res.json({ data })
  } catch (err) {
    return res.status(200).json({ error: String(err) })
  }
}
