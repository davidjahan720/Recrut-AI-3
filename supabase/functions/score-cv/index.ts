import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'
import { Resend } from 'https://esm.sh/resend@3.2.0'
import mammoth from 'https://esm.sh/mammoth@1.6.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function isPdf(path: string) {
  return path.toLowerCase().endsWith('.pdf')
}

function isDocx(path: string) {
  return path.toLowerCase().endsWith('.docx') || path.toLowerCase().endsWith('.doc')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let applicationId: string | null = null

  try {
    const { job_id, cv_file_path } = await req.json()
    if (!job_id || !cv_file_path) throw new Error('job_id and cv_file_path requis')

    // 1. Récupérer l'offre
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, clients(name, notification_email)')
      .eq('id', job_id)
      .single()

    if (jobError || !job) throw new Error('Offre introuvable')
    if (job.status !== 'active') throw new Error('Offre clôturée')

    // 2. Créer la candidature pending
    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert({ job_id, cv_file_path, status: 'pending' })
      .select()
      .single()

    if (insertError || !application) throw new Error('Erreur création candidature : ' + insertError?.message)
    applicationId = application.id

    // 3. Télécharger le fichier
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cvs')
      .download(cv_file_path)

    if (downloadError || !fileData) throw new Error('Erreur téléchargement fichier : ' + downloadError?.message)

    const buffer = await fileData.arrayBuffer()

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const systemPrompt = Deno.env.get('SYSTEM_PROMPT') ?? `Tu es un expert en recrutement. Retourne UNIQUEMENT un JSON valide avec ces 6 champs : {"score":<0-100>,"justification":"<synthèse>","positive_points":["..."],"negative_points":["..."],"candidate_name":"<nom ou null>","candidate_email":"<email ou null>"}`

    let messageContent: Anthropic.MessageParam['content']

    if (isPdf(cv_file_path)) {
      // Envoi direct du PDF à Claude (pas besoin d'extraction de texte)
      const base64 = toBase64(buffer)
      messageContent = [
        {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        },
        {
          type: 'text' as const,
          text: `DESCRIPTION DU POSTE :\n${job.description}\n\nAnalyse ce CV par rapport à ce poste.`,
        },
      ]
    } else if (isDocx(cv_file_path)) {
      // Extraction texte depuis Word
      const result = await mammoth.extractRawText({ arrayBuffer: buffer })
      const text = result.value?.trim()
      if (!text || text.length < 50) throw new Error('Document Word illisible ou vide')
      messageContent = [{
        type: 'text' as const,
        text: `DESCRIPTION DU POSTE :\n${job.description}\n\nCV DU CANDIDAT :\n${text}`,
      }]
    } else {
      throw new Error('Format non supporté. Utilisez PDF ou Word (.docx)')
    }

    // 4. Appel Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    let parsed: {
      score: number
      justification: string
      positive_points?: string[]
      negative_points?: string[]
      candidate_name: string | null
      candidate_email: string | null
    }

    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Réponse Claude non parseable : ' + raw.slice(0, 300))
      parsed = JSON.parse(match[0])
    }

    const { score, justification, positive_points, negative_points, candidate_name, candidate_email } = parsed
    if (typeof score !== 'number' || score < 0 || score > 100) throw new Error('Score invalide : ' + score)

    const qualified = score >= job.score_threshold
    const status = qualified ? 'qualified' : 'rejected'

    // 5. Mise à jour de la candidature
    await supabase.from('applications').update({
      score,
      justification,
      positive_points: positive_points?.length ? JSON.stringify(positive_points) : null,
      negative_points: negative_points?.length ? JSON.stringify(negative_points) : null,
      candidate_name: candidate_name ?? null,
      candidate_email: candidate_email ?? null,
      status,
    }).eq('id', applicationId)

    // 6. Email si qualifié
    let emailSentAt: string | null = null
    if (qualified) {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
      const clientData = job.clients as { name: string; notification_email: string }
      const ppList = positive_points?.map(p => `<li>✅ ${p}</li>`).join('') ?? ''
      const npList = negative_points?.map(p => `<li>⚠️ ${p}</li>`).join('') ?? ''

      const { error: emailError } = await resend.emails.send({
        from: 'RecrutAI <onboarding@resend.dev>',
        to: clientData.notification_email,
        subject: `CV qualifié — ${candidate_name ?? 'Candidat'} — ${job.title}`,
        html: `
          <h2>Nouveau CV qualifié — ${job.title}</h2>
          <p><strong>Candidat :</strong> ${candidate_name ?? 'Non renseigné'}</p>
          <p><strong>Email :</strong> ${candidate_email ?? 'Non renseigné'}</p>
          <p><strong>Score :</strong> ${score}/100 (seuil : ${job.score_threshold})</p>
          <hr/>
          <p><strong>Synthèse :</strong> ${justification}</p>
          ${ppList ? `<p><strong>Points positifs :</strong></p><ul>${ppList}</ul>` : ''}
          ${npList ? `<p><strong>Points négatifs :</strong></p><ul>${npList}</ul>` : ''}
        `,
      })

      if (!emailError) {
        emailSentAt = new Date().toISOString()
        await supabase.from('applications').update({ email_sent_at: emailSentAt }).eq('id', applicationId)
      }
    }

    return new Response(
      JSON.stringify({ id: applicationId, score, status, justification, positive_points, negative_points, candidate_name, candidate_email, email_sent_at: emailSentAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (applicationId) {
      await supabase.from('applications')
        .update({ status: 'error', justification: message })
        .eq('id', applicationId)
        .catch(() => {})
    }
    return new Response(
      JSON.stringify({ error: message, status: 'error', applicationId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
