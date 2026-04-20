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

    const systemPrompt = `Tu es un expert en recrutement senior. Tu analyses des CV par rapport à des fiches de poste et attribues un score objectif.

RÈGLE ABSOLUE : ta réponse doit être EXCLUSIVEMENT un objet JSON valide, rien d'autre.
- Pas de markdown, pas de \`\`\`json, pas de texte avant, pas de texte après.
- Commence directement par { et termine par }.

━━━ GRILLE DE SCORING ━━━

Le score est calculé sur 4 dimensions :

1. EXPÉRIENCE MÉTIER (40 pts)
   - Années d'expérience dans le domaine du poste
   - Pertinence des postes précédents
   - Progression de carrière cohérente

2. COMPÉTENCES TECHNIQUES / HARD SKILLS (30 pts)
   - Maîtrise des compétences clés listées dans la fiche de poste
   - Outils, technologies, méthodes spécifiques au métier
   - Certifications ou formations spécialisées

3. FORMATION (15 pts)
   - Niveau de diplôme requis atteint
   - Spécialisation en adéquation avec le poste

4. SOFT SKILLS & FIT (15 pts)
   - Compétences comportementales mentionnées
   - Cohérence du parcours avec la culture du poste

Correspondance score / profil :
- 0–10   : CV hors sujet — métier totalement différent du poste
- 11–35  : Très faible adéquation — compétences clés absentes
- 36–55  : Adéquation partielle — quelques points communs mais lacunes majeures
- 56–74  : Bon profil — critères principaux présents, quelques manques
- 75–89  : Très bon profil — forte adéquation, expérience solide
- 90–100 : Profil idéal — correspond parfaitement au poste

━━━ GESTION DES CV NON-PERTINENTS ━━━

Si le CV décrit un métier sans rapport avec le poste (ex: plombier candidatant à un poste de développeur, comptable pour un poste de chef cuisinier) :
- Mets "is_relevant": false
- Le score doit être compris entre 0 et 10
- Explique brièvement le décalage dans "justification"
- "positive_points" peut être vide []
- "negative_points" doit mentionner l'absence totale d'adéquation métier

━━━ EXEMPLES FEW-SHOT ━━━

Exemple 1 — Profil idéal (score élevé)
Poste : Développeur React Senior, 5 ans d'expérience requis
CV : 6 ans d'expérience React/TypeScript, a livré 3 SaaS en production, maîtrise Next.js et TailwindCSS, diplômé ingénieur informatique.
→ {
  "score": 88,
  "is_relevant": true,
  "justification": "Profil senior React avec 6 ans d'expérience, stack parfaitement alignée. Expérience SaaS concrète. Léger manque sur les tests automatisés mentionnés dans la fiche.",
  "positive_points": ["6 ans React/TypeScript", "3 SaaS livrés en production", "Next.js et Tailwind maîtrisés"],
  "negative_points": ["Tests automatisés non mentionnés", "Expérience équipe non détaillée"],
  "candidate_name": "Jean Dupont",
  "candidate_email": "jean.dupont@email.com"
}

Exemple 2 — Adéquation partielle (score moyen)
Poste : Chef de projet digital, 3 ans requis, gestion Agile obligatoire
CV : 2 ans en gestion de projet classique (waterfall), notions Agile en formation, pas d'expérience digitale directe.
→ {
  "score": 42,
  "is_relevant": true,
  "justification": "Expérience en gestion de projet présente mais insuffisante (2 ans vs 3 requis) et méthodologie Agile non pratiquée en contexte réel. Le profil digital est à construire.",
  "positive_points": ["Base solide en gestion de projet", "Formation Agile suivie"],
  "negative_points": ["Agile non pratiqué en conditions réelles", "1 an sous le minimum requis", "Zéro expérience secteur digital"],
  "candidate_name": "Marie Martin",
  "candidate_email": null
}

Exemple 3 — CV hors sujet
Poste : Développeur Python / Data Engineer
CV : Électricien industriel, 10 ans d'expérience en câblage et maintenance.
→ {
  "score": 3,
  "is_relevant": false,
  "justification": "Le CV décrit un profil d'électricien industriel sans aucune compétence en développement Python ou data engineering. Les métiers n'ont aucun point commun.",
  "positive_points": [],
  "negative_points": ["Métier totalement différent du poste", "Aucune compétence technique informatique"],
  "candidate_name": "Paul Leblanc",
  "candidate_email": "p.leblanc@mail.fr"
}

━━━ FORMAT DE RÉPONSE ━━━

{
  "score": <entier entre 0 et 100>,
  "is_relevant": <true ou false>,
  "justification": "<synthèse objective en 2-3 phrases>",
  "positive_points": ["<point 1>", "<point 2>", "<point 3>"],
  "negative_points": ["<point 1>", "<point 2>"],
  "candidate_name": "<prénom nom ou null si absent>",
  "candidate_email": "<email ou null si absent>"
}`

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
      is_relevant?: boolean
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

    const { score, is_relevant, justification, positive_points, negative_points, candidate_name, candidate_email } = parsed
    if (typeof score !== 'number' || score < 0 || score > 100) throw new Error('Score invalide : ' + score)

    const qualified = is_relevant !== false && score >= job.score_threshold
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
