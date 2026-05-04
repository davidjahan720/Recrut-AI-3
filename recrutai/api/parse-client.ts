/// <reference types="node" />

// Vercel Function — extraction des coordonnées d'un client à partir d'une
// fiche de poste PDF, via Mistral AI.
//
// Conformité :
//  - RGPD (art. 5.1.c minimisation) : seuls les champs nécessaires
//    (nom entreprise, contact RH, emails de notification) sont extraits.
//  - RGPD (art. 5.1.f) : aucun journal de PII, TLS 1.3, hébergement UE.
//  - RGESN 4.7 : OCR + 1 appel chat, fetch natif, pas de SDK lourd.

export const config = { maxDuration: 60 }

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1'
const MAX_PDF_BYTES = 4_000_000

interface ParsedClient {
  name: string | null
  contact_name: string | null
  contact_email: string | null
  notification_email: string | null
  sector: string | null
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
  'Tu es un extracteur de données précis et minimaliste. Tu réponds EXCLUSIVEMENT ' +
  'avec un objet JSON valide, sans markdown, sans texte avant ni après.'

const USER_INSTRUCTION = `Lis ce document EN ENTIER (en-têtes, pieds de page, signatures) et construis un JSON.

ÉTAPE 1 — Relève TOUTES les chaînes contenant le caractère "@" : ce sont des emails.
ÉTAPE 2 — Relève tout prénom+nom, tout titre RH ("DRH", "Responsable RH", "Chargé de recrutement") ou mention "Contact :", "Référent :", "Candidature à adresser à :".
ÉTAPE 3 — Construis le JSON :

- "name" : nom de l'entreprise (logo, en-tête, pied de page, mentions légales).
- "contact_name" : prénom+nom ou titre de la personne trouvée à l'étape 2.
   Si plusieurs noms → prends le plus proche d'un email. Si aucun nom propre → mets le titre RH (ex: "Service RH"). JAMAIS null si quoi que ce soit a été trouvé à l'étape 2.
- "contact_email" : premier email trouvé à l'étape 1. JAMAIS null si au moins un "@" existe dans le document.
- "notification_email" : email où envoyer les CV. Si un seul email → même valeur que contact_email. Si plusieurs emails → prends celui le plus proche du mot "recrutement", "candidature", "RH" ou "contact". JAMAIS null si contact_email est non-null.
- "sector" : secteur d'activité de l'entreprise en 2-3 mots.

Format imposé :
{
  "name": "...",
  "contact_name": "...",
  "contact_email": "...",
  "notification_email": "...",
  "sector": "..."
}`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdf_base64 } = req.body ?? {}
    if (typeof pdf_base64 !== 'string' || pdf_base64.length === 0) {
      return res.status(400).json({ error: 'pdf_base64 manquant' })
    }
    const approxBytes = Math.floor(pdf_base64.length * 0.75)
    if (approxBytes > MAX_PDF_BYTES) {
      return res.status(413).json({ error: 'PDF trop volumineux (max 4 Mo)' })
    }

    const ocrText = await mistralOcrPdf(pdf_base64)
    const raw = await mistralChatJson(SYSTEM_PROMPT, `${USER_INSTRUCTION}\n\nDOCUMENT :\n${ocrText}`)

    let parsed: ParsedClient
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Réponse non parseable')
      parsed = JSON.parse(match[0])
    }

    // Fallbacks : notification_email ne doit jamais être vide si un email est trouvé.
    if (!parsed.notification_email && parsed.contact_email) {
      parsed.notification_email = parsed.contact_email
    }
    if (!parsed.contact_email && parsed.notification_email) {
      parsed.contact_email = parsed.notification_email
    }

    return res.json({ data: parsed })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur'
    console.error('parse-client:', message)
    return res.status(200).json({ error: message })
  }
}
