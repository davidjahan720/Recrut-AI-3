/// <reference types="node" />

export const config = { maxDuration: 30 }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { application_id } = req.body
  if (!application_id) return res.status(400).json({ error: 'application_id requis' })

  try {
    // Server-to-server call → no CORS restriction, reuses RESEND_API_KEY already in Supabase
    const r = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/send-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ application_id }),
    })

    const json = await r.json()
    return res.status(200).json(json)
  } catch (err) {
    return res.status(200).json({ error: String(err) })
  }
}
