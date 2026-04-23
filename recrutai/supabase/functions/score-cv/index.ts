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

function isImage(path: string): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  const p = path.toLowerCase()
  if (p.endsWith('.png')) return 'image/png'
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg'
  if (p.endsWith('.webp')) return 'image/webp'
  return null
}

function isHtml(path: string) {
  return path.toLowerCase().endsWith('.html') || path.toLowerCase().endsWith('.htm')
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
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
    if (!cv_file_path) throw new Error('cv_file_path requis')

    // No job_id → mode base de données : extraire nom/email/secteur et créer la candidature
    if (!job_id) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('cvs').download(cv_file_path)
      if (downloadError || !fileData) throw new Error('Erreur téléchargement : ' + downloadError?.message)

      const buffer = await fileData.arrayBuffer()
      const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

      const instruction = 'Extrais les informations du candidat depuis ce CV. Réponds UNIQUEMENT avec un objet JSON valide : {"candidate_name": "Prénom Nom", "candidate_email": "email@exemple.com", "cv_sector": "secteur métier"}. Pour cv_sector : domaine métier principal en 2-4 mots (ex: "développeur web", "infirmier", "commercial B2B", "comptable senior"). Si une info est absente, utilise null.'

      let messageContent: Anthropic.MessageParam['content']

      if (isPdf(cv_file_path)) {
        const base64 = toBase64(buffer)
        messageContent = [
          { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } },
          { type: 'text' as const, text: instruction },
        ]
      } else if (isDocx(cv_file_path)) {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer })
        messageContent = [{ type: 'text' as const, text: `CV :\n${result.value}\n\n${instruction}` }]
      } else if (isHtml(cv_file_path)) {
        const text = extractTextFromHtml(new TextDecoder().decode(buffer))
        messageContent = [{ type: 'text' as const, text: `CV :\n${text}\n\n${instruction}` }]
      } else if (isImage(cv_file_path)) {
        const mediaType = isImage(cv_file_path)!
        const base64 = toBase64(buffer)
        messageContent = [
          { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } },
          { type: 'text' as const, text: instruction },
        ]
      } else {
        throw new Error('Format non supporté')
      }

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        system: 'Tu extrais des informations structurées depuis des CV. Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans markdown, sans explication.',
        messages: [{ role: 'user', content: messageContent }],
      })

      const raw = (message.content[0] as { type: string; text: string }).text.trim()
      let parsed: { candidate_name: string | null; candidate_email: string | null; cv_sector: string | null }
      try {
        parsed = JSON.parse(raw)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        parsed = match ? JSON.parse(match[0]) : { candidate_name: null, candidate_email: null, cv_sector: null }
      }

      const { data: application, error: insertError } = await supabase.from('applications').insert({
        cv_file_path,
        candidate_name: parsed.candidate_name ?? null,
        candidate_email: parsed.candidate_email ?? null,
        cv_sector: parsed.cv_sector ?? null,
        status: 'pending',
      }).select().single()

      if (insertError || !application) throw new Error('Erreur création candidature : ' + insertError?.message)
      applicationId = application.id

      return new Response(
        JSON.stringify({ id: application.id, candidate_name: parsed.candidate_name, candidate_email: parsed.candidate_email, cv_sector: parsed.cv_sector }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Récupérer l'offre
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, clients(name, notification_email)')
      .eq('id', job_id)
      .single()

    if (jobError || !job) throw new Error('Offre introuvable')
    if (job.status === 'closed') throw new Error('Offre clôturée')

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
  "justification": "Profil senior React aligné, 6 ans d'expérience SaaS, léger manque sur les tests.",
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
  "justification": "Gestion de projet insuffisante (2 ans/3 requis), Agile non pratiqué, profil digital absent.",
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
  "justification": "Électricien industriel, aucune compétence Python ou data engineering.",
  "positive_points": [],
  "negative_points": ["Métier totalement différent du poste", "Aucune compétence technique informatique"],
  "candidate_name": "Paul Leblanc",
  "candidate_email": "p.leblanc@mail.fr"
}

━━━ FORMAT DE RÉPONSE ━━━

IMPORTANT : positive_points et negative_points sont limités à 3 éléments maximum chacun.

{
  "score": <entier entre 0 et 100>,
  "is_relevant": <true ou false>,
  "justification": "<synthèse en 1 phrase courte, max 20 mots>",
  "positive_points": ["<point 1>", "<point 2>", "<point 3>"],
  "negative_points": ["<point 1>", "<point 2>", "<point 3>"],
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
    } else if (isHtml(cv_file_path)) {
      // Extraction texte depuis HTML
      const html = new TextDecoder().decode(buffer)
      const text = extractTextFromHtml(html)
      if (!text || text.length < 50) throw new Error('Fichier HTML illisible ou vide')
      messageContent = [{
        type: 'text' as const,
        text: `DESCRIPTION DU POSTE :\n${job.description}\n\nCV DU CANDIDAT :\n${text}`,
      }]
    } else if (isImage(cv_file_path)) {
      // Envoi direct de l'image à Claude (PNG, JPG, WEBP)
      const mediaType = isImage(cv_file_path)!
      const base64 = toBase64(buffer)
      messageContent = [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
            data: base64,
          },
        },
        {
          type: 'text' as const,
          text: `DESCRIPTION DU POSTE :\n${job.description}\n\nAnalyse ce CV (image) par rapport à ce poste.`,
        },
      ]
    } else {
      throw new Error('Format non supporté. Utilisez PDF, Word (.docx), image (.png, .jpg) ou HTML')
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
    const { error: updateError } = await supabase.from('applications').update({
      score,
      justification,
      positive_points: positive_points?.length ? JSON.stringify(positive_points) : null,
      negative_points: negative_points?.length ? JSON.stringify(negative_points) : null,
      candidate_name: candidate_name ?? null,
      candidate_email: candidate_email ?? null,
      status,
    }).eq('id', applicationId)
    if (updateError) throw new Error('Erreur mise à jour candidature : ' + updateError.message)

    return new Response(
      JSON.stringify({ id: applicationId, score, status, justification, positive_points, negative_points, candidate_name, candidate_email }),
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
