const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!

  const dbHeaders = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }

  let application_id: string | null = null

  try {
    const body = await req.json()
    application_id = body.application_id ?? null
    if (!application_id) throw new Error('application_id requis')

    // Fetch application + job + client via REST API
    const appRes = await fetch(
      `${SUPABASE_URL}/rest/v1/applications?id=eq.${application_id}&select=*,jobs(title,score_threshold,status,clients(name,notification_email))`,
      { headers: dbHeaders }
    )
    const apps = await appRes.json()
    if (!appRes.ok || !apps?.length) throw new Error('Candidature introuvable')

    const app = apps[0]
    const job = app.jobs
    const client = job?.clients

    if (job?.status === 'inactive') {
      return new Response(JSON.stringify({ success: false, blocked: true, message: 'Offre en pause — aucun email envoyé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipientEmail = 'jahandavid@gmail.com'

    const positive: string[] = app.positive_points ? JSON.parse(app.positive_points) : []
    const negative: string[] = app.negative_points ? JSON.parse(app.negative_points) : []
    const ppList = positive.map((p: string) => `<li style="margin:4px 0">✅ ${p}</li>`).join('')
    const npList = negative.map((p: string) => `<li style="margin:4px 0">⚠️ ${p}</li>`).join('')

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:20px 24px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">RecrutAI — Analyse du candidat</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">${job.title} · ${client.name}</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:160px">Candidat</td><td style="padding:8px 0;font-size:14px;font-weight:600">${app.candidate_name ?? 'Non renseigné'}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Email</td><td style="padding:8px 0;font-size:14px">${app.candidate_email ?? 'Non renseigné'}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Score</td><td style="padding:8px 0;font-size:14px"><strong>${app.score ?? '—'}/100</strong> (seuil : ${job.score_threshold})</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Statut</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#16a34a">Qualifié</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
          <p style="color:#374151;font-size:14px;margin:0 0 8px"><strong>Synthèse :</strong></p>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">${app.justification ?? '—'}</p>
          ${ppList ? `<p style="color:#374151;font-size:14px;margin:0 0 4px"><strong>Points positifs :</strong></p><ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#374151">${ppList}</ul>` : ''}
          ${npList ? `<p style="color:#374151;font-size:14px;margin:0 0 4px"><strong>Points à améliorer :</strong></p><ul style="margin:0;padding-left:20px;font-size:14px;color:#374151">${npList}</ul>` : ''}
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Envoyé par RecrutAI</p>
      </div>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'RecrutAI <onboarding@resend.dev>',
        to: recipientEmail,
        subject: `Analyse IA — ${app.candidate_name ?? 'Candidat'} — ${job.title}`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const t = await resendRes.text()
      throw new Error(`Resend ${resendRes.status}: ${t.slice(0, 200)}`)
    }

    const emailSentAt = new Date().toISOString()
    await fetch(
      `${SUPABASE_URL}/rest/v1/applications?id=eq.${application_id}`,
      { method: 'PATCH', headers: dbHeaders, body: JSON.stringify({ status: 'qualified', email_sent_at: emailSentAt }) }
    )

    return new Response(JSON.stringify({ success: true, email_sent_at: emailSentAt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (application_id) {
      fetch(
        `${SUPABASE_URL}/rest/v1/applications?id=eq.${application_id}`,
        { method: 'PATCH', headers: dbHeaders, body: JSON.stringify({ status: 'error', justification: message }) }
      ).catch(() => {})
    }
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
