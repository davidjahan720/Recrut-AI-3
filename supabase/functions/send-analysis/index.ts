import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { application_id } = await req.json()
    if (!application_id) throw new Error('application_id requis')

    const { data: app, error } = await supabase
      .from('applications')
      .select('*, jobs(title, score_threshold, clients(name, notification_email))')
      .eq('id', application_id)
      .single()

    if (error || !app) throw new Error('Candidature introuvable')

    const job = app.jobs as { title: string; score_threshold: number; clients: { name: string; notification_email: string } }
    const client = job.clients

    if (!client?.notification_email) throw new Error('Email client non configuré')

    const positive: string[] = app.positive_points ? JSON.parse(app.positive_points) : []
    const negative: string[] = app.negative_points ? JSON.parse(app.negative_points) : []

    const ppList = positive.map(p => `<li style="margin:4px 0">✅ ${p}</li>`).join('')
    const npList = negative.map(p => `<li style="margin:4px 0">⚠️ ${p}</li>`).join('')

    const statusLabel = app.status === 'qualified' ? 'Qualifié' : app.status === 'rejected' ? 'Rejeté' : 'En attente'
    const statusColor = app.status === 'qualified' ? '#16a34a' : app.status === 'rejected' ? '#64748b' : '#d97706'

    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

    const { error: emailError } = await resend.emails.send({
      from: 'RecrutAI <onboarding@resend.dev>',
      to: client.notification_email,
      subject: `Analyse IA — ${app.candidate_name ?? 'Candidat'} — ${job.title}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:20px 24px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">RecrutAI — Analyse du candidat</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">${job.title} · ${client.name}</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px;width:160px">Candidat</td>
                <td style="padding:8px 0;font-size:14px;font-weight:600">${app.candidate_name ?? 'Non renseigné'}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px">Email</td>
                <td style="padding:8px 0;font-size:14px">${app.candidate_email ?? 'Non renseigné'}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px">Score</td>
                <td style="padding:8px 0;font-size:14px"><strong>${app.score ?? '—'}/100</strong> (seuil : ${job.score_threshold})</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px">Statut</td>
                <td style="padding:8px 0;font-size:14px;font-weight:600;color:${statusColor}">${statusLabel}</td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
            <p style="color:#374151;font-size:14px;margin:0 0 8px"><strong>Synthèse :</strong></p>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">${app.justification ?? '—'}</p>
            ${ppList ? `<p style="color:#374151;font-size:14px;margin:0 0 4px"><strong>Points positifs :</strong></p><ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#374151">${ppList}</ul>` : ''}
            ${npList ? `<p style="color:#374151;font-size:14px;margin:0 0 4px"><strong>Points à améliorer :</strong></p><ul style="margin:0;padding-left:20px;font-size:14px;color:#374151">${npList}</ul>` : ''}
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Envoyé par RecrutAI</p>
        </div>
      `,
    })

    if (emailError) throw new Error('Erreur envoi email : ' + emailError.message)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
