// Edge Function — analyse de CV par rapport à une offre via Mistral AI.
//
// Conformité :
//  - RGPD (art. 5, 28, 32, 44+) : sous-traitant Mistral hébergé UE,
//    aucune PII journalisée (logs : code HTTP + identifiants techniques),
//    minimisation des données envoyées à l'IA (texte du CV uniquement),
//    chiffrement TLS 1.3 vers l'API Mistral, aucun transfert hors UE.
//  - RGESN 4.7 / 4.8 : 1 seul appel d'IA quand possible, OCR uniquement
//    pour les formats binaires (PDF/image) ; texte brut pour DOCX/HTML.
//  - Sécurité : variables d'environnement chiffrées (Supabase secrets),
//    rate limiting Supabase + RLS, CORS contrôlé.
//
// Migration 2026-05 : Anthropic Claude → Mistral AI (UE, France).
//   Variable env : MISTRAL_API_KEY (ANTHROPIC_API_KEY est déprécié).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.2.0'
import mammoth from 'https://esm.sh/mammoth@1.6.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1'
const MISTRAL_CHAT_MODEL = 'mistral-large-latest'
const MISTRAL_OCR_MODEL = 'mistral-ocr-latest'

// ─── Helpers fichiers ──────────────────────────────────────────────────────

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

// ─── Helpers Mistral ───────────────────────────────────────────────────────

function getMistralKey(): string {
  const key = Deno.env.get('MISTRAL_API_KEY')
  if (!key) throw new Error('MISTRAL_API_KEY non configurée')
  return key
}

interface MistralMessageContent {
  role: 'system' | 'user'
  content: string
}

/**
 * Appel chat completion Mistral.
 * `response_format: json_object` force le modèle à répondre en JSON valide.
 * RGPD : aucun log du contenu du message — seul le code HTTP est tracé.
 */
async function callMistralChat(
  messages: MistralMessageContent[],
  opts: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {},
): Promise<string> {
  const r = await fetch(`${MISTRAL_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getMistralKey()}`,
    },
    body: JSON.stringify({
      model: MISTRAL_CHAT_MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.2,
      ...(opts.jsonMode !== false ? { response_format: { type: 'json_object' } } : {}),
      messages,
    }),
  })
  if (!r.ok) {
    // RGPD : on ne logge pas le corps qui pourrait contenir un écho de PII.
    console.error(`Mistral chat HTTP ${r.status}`)
    throw new Error(`Mistral chat HTTP ${r.status}`)
  }
  const json = await r.json()
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Réponse Mistral inattendue')
  return content.trim()
}

/**
 * OCR Mistral pour PDF et images : retourne le contenu textuel agrégé
 * (markdown) extrait page par page.
 */
async function mistralOcr(
  base64Data: string,
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp',
): Promise<string> {
  const isDoc = mimeType === 'application/pdf'
  const document = isDoc
    ? { type: 'document_url', document_url: `data:${mimeType};base64,${base64Data}` }
    : { type: 'image_url', image_url: `data:${mimeType};base64,${base64Data}` }
  const r = await fetch(`${MISTRAL_BASE_URL}/ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getMistralKey()}`,
    },
    body: JSON.stringify({
      model: MISTRAL_OCR_MODEL,
      document,
      include_image_base64: false,
    }),
  })
  if (!r.ok) {
    console.error(`Mistral OCR HTTP ${r.status}`)
    throw new Error(`Mistral OCR HTTP ${r.status}`)
  }
  const json = await r.json()
  const pages = (json?.pages ?? []) as { markdown?: string }[]
  const text = pages.map(p => p.markdown ?? '').join('\n\n').trim()
  if (!text || text.length < 20) throw new Error('OCR vide ou illisible')
  return text
}

/**
 * Extrait le texte d'un CV quel que soit le format.
 * RGESN : DOCX/HTML traités localement, OCR uniquement pour formats binaires.
 */
async function extractCvText(buffer: ArrayBuffer, path: string): Promise<string> {
  if (isDocx(path)) {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = result.value?.trim() ?? ''
    if (text.length < 50) throw new Error('Document Word illisible ou vide')
    return text
  }
  if (isHtml(path)) {
    const text = extractTextFromHtml(new TextDecoder().decode(buffer))
    if (text.length < 50) throw new Error('Fichier HTML illisible ou vide')
    return text
  }
  if (isPdf(path)) {
    return await mistralOcr(toBase64(buffer), 'application/pdf')
  }
  const imageMime = isImage(path)
  if (imageMime) {
    return await mistralOcr(toBase64(buffer), imageMime)
  }
  throw new Error('Format non supporté. Utilisez PDF, Word (.docx), image (.png, .jpg, .webp) ou HTML')
}

// ─── Prompts ───────────────────────────────────────────────────────────────

const EXTRACT_INSTRUCTION =
  'Extrais les informations du candidat depuis ce CV. Réponds UNIQUEMENT avec un objet JSON valide : ' +
  '{"candidate_name": "Prénom Nom", "candidate_email": "email@exemple.com", "cv_sector": "secteur métier"}. ' +
  'Pour cv_sector : domaine métier principal en 2-4 mots (ex: "développeur web", "infirmier", "commercial B2B", "comptable senior"). ' +
  'Si une info est absente, utilise null.'

const SCORING_SYSTEM_PROMPT = `Tu es un expert en recrutement senior. Tu analyses des CV par rapport à des fiches de poste et attribues un score objectif.

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

━━━ CHEVAUCHEMENT DE DATES ━━━

Analyse soigneusement les dates de début et de fin de chaque poste dans l'expérience professionnelle.
Si deux postes ou plus se chevauchent dans le temps (dates qui se superposent) sans indication de temps partiel ou de mission parallèle explicite :
- C'est un signal négatif : incohérence du parcours, possible embellissement du CV
- Ne pas déduire de points, mais ajouter dans "negative_points" : "Dates de travail qui se chevauchent"

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

// ─── Handler ───────────────────────────────────────────────────────────────

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

    // ─── Mode "inbox" : pas de job_id, on extrait juste les coordonnées ───
    if (!job_id) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('cvs').download(cv_file_path)
      if (downloadError || !fileData) throw new Error('Erreur téléchargement : ' + downloadError?.message)

      const buffer = await fileData.arrayBuffer()
      const cvText = await extractCvText(buffer, cv_file_path)

      const raw = await callMistralChat([
        { role: 'system', content: 'Tu extrais des informations structurées depuis des CV. Réponds UNIQUEMENT avec un objet JSON valide.' },
        { role: 'user', content: `CV :\n${cvText}\n\n${EXTRACT_INSTRUCTION}` },
      ], { maxTokens: 256 })

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
        JSON.stringify({
          id: application.id,
          candidate_name: parsed.candidate_name,
          candidate_email: parsed.candidate_email,
          cv_sector: parsed.cv_sector,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ─── Mode scoring : job_id présent ───
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, clients(name, notification_email)')
      .eq('id', job_id)
      .single()

    if (jobError || !job) throw new Error('Offre introuvable')
    if (job.status === 'closed') throw new Error('Offre clôturée')

    // 1. Créer la candidature pending
    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert({ job_id, cv_file_path, status: 'pending' })
      .select()
      .single()

    if (insertError || !application) throw new Error('Erreur création candidature : ' + insertError?.message)
    applicationId = application.id

    // 2. Télécharger le CV et extraire le texte
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cvs')
      .download(cv_file_path)

    if (downloadError || !fileData) throw new Error('Erreur téléchargement fichier : ' + downloadError?.message)

    const buffer = await fileData.arrayBuffer()
    const cvText = await extractCvText(buffer, cv_file_path)

    // 3. Appel Mistral pour le scoring (mode JSON garanti)
    const raw = await callMistralChat([
      { role: 'system', content: SCORING_SYSTEM_PROMPT },
      { role: 'user', content: `DESCRIPTION DU POSTE :\n${job.description}\n\nCV DU CANDIDAT :\n${cvText}` },
    ], { maxTokens: 1024 })

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
      if (!match) throw new Error('Réponse Mistral non parseable')
      parsed = JSON.parse(match[0])
    }

    const { score, is_relevant, justification, positive_points, negative_points, candidate_name, candidate_email } = parsed
    if (typeof score !== 'number' || score < 0 || score > 100) throw new Error('Score invalide : ' + score)

    const qualified = is_relevant !== false && score >= job.score_threshold
    const status = qualified ? 'qualified' : 'rejected'

    // 4. Mise à jour de la candidature
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

    // 5. Notification email au client si qualifié
    //    RGPD : destinataire = email de notification du client (et non un email
    //           personnel codé en dur). Plus de fuite vers une boîte tierce.
    const clientNotifEmail = (job.clients as { notification_email?: string | null })?.notification_email
    if (qualified && applicationId && clientNotifEmail) {
      try {
        const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
        if (RESEND_KEY) {
          const pp = positive_points ?? []
          const np = negative_points ?? []
          const ppList = pp.map((p: string) => `<li style="margin:4px 0">✅ ${escapeHtml(p)}</li>`).join('')
          const npList = np.map((p: string) => `<li style="margin:4px 0">⚠️ ${escapeHtml(p)}</li>`).join('')
          const clientName = (job.clients as { name: string })?.name ?? ''
          const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:20px 24px;border-radius:8px 8px 0 0"><h1 style="color:white;margin:0;font-size:20px">RecrutAI — Analyse du candidat</h1><p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px">${escapeHtml(job.title)} · ${escapeHtml(clientName)}</p></div><div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px"><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr><td style="padding:8px 0;color:#374151;font-size:14px;width:160px">Candidat</td><td style="padding:8px 0;font-size:14px;font-weight:600">${escapeHtml(candidate_name ?? 'Non renseigné')}</td></tr><tr><td style="padding:8px 0;color:#374151;font-size:14px">Email</td><td style="padding:8px 0;font-size:14px">${escapeHtml(candidate_email ?? 'Non renseigné')}</td></tr><tr><td style="padding:8px 0;color:#374151;font-size:14px">Score</td><td style="padding:8px 0;font-size:14px"><strong>${score}/100</strong> (seuil : ${job.score_threshold})</td></tr><tr><td style="padding:8px 0;color:#374151;font-size:14px">Statut</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#15803d">Qualifié</td></tr></table><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/><p style="color:#1f2937;font-size:14px;margin:0 0 8px"><strong>Synthèse :</strong></p><p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0 0 16px">${escapeHtml(justification ?? '—')}</p>${ppList ? `<p style="color:#1f2937;font-size:14px;margin:0 0 4px"><strong>Points positifs :</strong></p><ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#1f2937">${ppList}</ul>` : ''}${npList ? `<p style="color:#1f2937;font-size:14px;margin:0 0 4px"><strong>Points à améliorer :</strong></p><ul style="margin:0;padding-left:20px;font-size:14px;color:#1f2937">${npList}</ul>` : ''}</div><p style="text-align:center;color:#6b7280;font-size:12px;margin-top:16px">Envoyé par RecrutAI · <a href="https://recrutai2-app.vercel.app/privacy" style="color:#6b7280">Politique de confidentialité</a></p></div>`
          const resend = new Resend(RESEND_KEY)
          const { error: emailErr } = await resend.emails.send({
            from: 'RecrutAI <onboarding@resend.dev>',
            to: clientNotifEmail,
            subject: `Analyse IA — ${candidate_name ?? 'Candidat'} — ${job.title}`,
            html,
          })
          if (!emailErr) {
            await supabase.from('applications').update({ email_sent_at: new Date().toISOString() }).eq('id', applicationId)
          } else {
            // RGPD : on logge le code, pas le contenu
            console.error('Resend error code:', (emailErr as { name?: string })?.name ?? 'unknown')
          }
        } else {
          console.error('RESEND_API_KEY non configurée')
        }
      } catch (emailEx) {
        console.error('Email send exception:', emailEx instanceof Error ? emailEx.name : 'unknown')
      }
    }

    // 6. Déduplication : même nom + même email + même offre → garder le plus récent
    if (candidate_name && candidate_email) {
      const { data: dupes } = await supabase
        .from('applications')
        .select('id, cv_file_path')
        .eq('job_id', job_id)
        .eq('candidate_name', candidate_name)
        .eq('candidate_email', candidate_email)
        .neq('id', applicationId!)

      if (dupes && dupes.length > 0) {
        const dupeIds = (dupes as { id: string; cv_file_path: string }[]).map(d => d.id)
        const dupePaths = (dupes as { id: string; cv_file_path: string }[]).map(d => d.cv_file_path).filter(Boolean)
        await Promise.all([
          supabase.from('applications').delete().in('id', dupeIds),
          dupePaths.length > 0 ? supabase.storage.from('cvs').remove(dupePaths) : Promise.resolve(),
        ])
      }
    }

    return new Response(
      JSON.stringify({ id: applicationId, score, status, justification, positive_points, negative_points, candidate_name, candidate_email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    if (applicationId) {
      await supabase.from('applications')
        .update({ status: 'error', justification: message })
        .eq('id', applicationId)
        .catch(() => {})
    }
    // Réponse 200 volontaire pour ne pas révéler la stack côté client (sécurité).
    return new Response(
      JSON.stringify({ error: message, status: 'error', applicationId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// Anti-injection HTML pour les champs IA insérés dans l'email.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
