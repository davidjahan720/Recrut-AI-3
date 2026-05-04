/// <reference types="node" />

// Vercel Function — extraction structurée d'une fiche de poste PDF via Mistral AI.
//
// Conformité :
//  - RGPD : sous-traitant Mistral hébergé UE, aucun journal de PII,
//           variables d'environnement chiffrées.
//  - RGESN 4.7 : 1 appel OCR + 1 appel chat (mode JSON garanti) ;
//                pas de SDK lourd, fetch natif Node 18+.
//  - Sécurité : validation entrée (type/taille), pas de stack-trace exposée.

export const config = { maxDuration: 120 }

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1'
const MAX_PDF_BYTES = 4_000_000 // 4 Mo après décodage base64 — défense en profondeur

interface ParsedJob {
  company_name: string | null
  title: string | null
  location: string | null
  contract_type: string | null
  description: string | null
  score_threshold: number | null
  sector: string | null
  contact_name: string | null
  contact_email: string | null
  notification_email: string | null
}

function getMistralKey(): string {
  const k = process.env.MISTRAL_API_KEY?.trim()
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
  'Tu es un extracteur de données pour fiches de poste. Tu réponds EXCLUSIVEMENT avec un objet JSON valide, ' +
  'sans markdown, sans texte avant ni après.'

const USER_INSTRUCTION = `Analyse cette fiche de poste et retourne un objet JSON.

Format imposé :
{
  "company_name": "<nom exact de l'entreprise>",
  "title": "<intitulé exact du poste>",
  "location": "<ville ou région, ex: Paris, Remote>",
  "contract_type": "<un parmi exactement : CDI, CDD, Alternance, Stage, Freelance>",
  "description": "<missions et profil recherché en 300 mots max>",
  "score_threshold": <entier entre 60 et 85>,
  "sector": "<secteur d'activité de l'entreprise, ex: Industrie, Tech, BTP, Santé, Finance, Retail — sinon null>",
  "contact_name": "<prénom et nom du contact RH ou manager mentionné, sinon null>",
  "contact_email": "<adresse email du contact si présente, sinon null>",
  "notification_email": "<adresse email pour les notifications de candidatures si différente du contact, sinon null>"
}`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdf_base64 } = req.body ?? {}
    if (typeof pdf_base64 !== 'string' || pdf_base64.length === 0) {
      return res.status(400).json({ error: 'pdf_base64 manquant' })
    }
    // Sécurité : taille max après décodage (4 octets base64 ≈ 3 octets binaires)
    const approxBytes = Math.floor(pdf_base64.length * 0.75)
    if (approxBytes > MAX_PDF_BYTES) {
      return res.status(413).json({ error: 'PDF trop volumineux (max 4 Mo)' })
    }

    const ocrText = await mistralOcrPdf(pdf_base64)
    const raw = await mistralChatJson(SYSTEM_PROMPT, `${USER_INSTRUCTION}\n\nFICHE DE POSTE :\n${ocrText}`)

    let parsed: ParsedJob
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Réponse non parseable')
      parsed = JSON.parse(match[0])
    }

    return res.json({ data: parsed })
  } catch (err) {
    // RGPD : message générique côté client, détails côté serveur uniquement
    const message = err instanceof Error ? err.message : 'Erreur'
    console.error('parse-job:', message)
    return res.status(200).json({ error: message })
  }
}
