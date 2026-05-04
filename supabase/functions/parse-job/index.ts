// Edge Function — extraction structurée d'une fiche de poste téléversée dans
// Storage puis parsée par Mistral AI.
//
// Conformité :
//  - RGPD : sous-traitant Mistral hébergé UE, aucune PII journalisée,
//           suppression du PDF source du Storage après lecture (minimisation
//           de la persistance, art. 5.1.c et 5.1.e).
//  - RGESN : OCR + 1 appel chat, aucun SDK lourd.
//
// Migration 2026-05 : Anthropic → Mistral.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1'

function getMistralKey(): string {
  const k = Deno.env.get('MISTRAL_API_KEY')
  if (!k) throw new Error('MISTRAL_API_KEY non configurée')
  return k
}

async function mistralOcrPdf(base64: string): Promise<string> {
  const r = await fetch(`${MISTRAL_BASE_URL}/ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getMistralKey()}`,
    },
    body: JSON.stringify({
      model: 'mistral-ocr-latest',
      document: { type: 'document_url', document_url: `data:application/pdf;base64,${base64}` },
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
  if (text.length < 20) throw new Error('OCR vide')
  return text
}

async function mistralChatJson(systemPrompt: string, userText: string): Promise<string> {
  const r = await fetch(`${MISTRAL_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getMistralKey()}`,
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      max_tokens: 1024,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
    }),
  })
  if (!r.ok) {
    console.error(`Mistral chat HTTP ${r.status}`)
    throw new Error(`Mistral chat HTTP ${r.status}`)
  }
  const json = await r.json()
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Réponse Mistral inattendue')
  return content.trim()
}

const SYSTEM_PROMPT =
  'Tu es un extracteur de données pour fiches de poste. Tu réponds EXCLUSIVEMENT ' +
  "avec un objet JSON valide, sans markdown, sans texte avant ni après."

const USER_INSTRUCTION = `Analyse cette fiche de poste et retourne un JSON.

Format imposé :
{
  "company_name": "<nom exact de l'entreprise>",
  "title": "<intitulé exact du poste>",
  "location": "<ville ou région>",
  "contract_type": "<un parmi exactement : CDI, CDD, Alternance, Stage, Freelance>",
  "description": "<missions et profil recherché en 300 mots max>",
  "score_threshold": <entier entre 60 et 85>
}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { file_path } = await req.json()
    if (!file_path || typeof file_path !== 'string') throw new Error('file_path manquant')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1. Télécharger le PDF depuis Storage (bucket privé, accès via service role).
    const downloadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/cvs/${file_path}`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
    )
    if (!downloadRes.ok) throw new Error(`Téléchargement impossible : ${downloadRes.status}`)

    const arrayBuffer = await downloadRes.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 8192
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    const pdf_base64 = btoa(binary)

    // 2. Suppression du PDF de Storage immédiatement après lecture (minimisation).
    fetch(`${supabaseUrl}/storage/v1/object/cvs/${file_path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    }).catch(() => {})

    // 3. OCR + extraction structurée.
    const ocrText = await mistralOcrPdf(pdf_base64)
    const raw = await mistralChatJson(SYSTEM_PROMPT, `${USER_INSTRUCTION}\n\nFICHE DE POSTE :\n${ocrText}`)

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Réponse non parseable')
      parsed = JSON.parse(match[0])
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur'
    console.error('parse-job edge:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
