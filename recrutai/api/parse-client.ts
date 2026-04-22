/// <reference types="node" />
import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdf_base64 } = req.body
    if (!pdf_base64) return res.status(400).json({ error: 'pdf_base64 manquant' })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 },
          },
          {
            type: 'text',
            text: `Tu es un extracteur de données précis. Lis ce document EN ENTIER, mot par mot, ligne par ligne, y compris les en-têtes, pieds de page, colonnes latérales et blocs de signature.

ÉTAPE 1 — SCAN EMAILS : Relève TOUTES les chaînes contenant le caractère "@" dans tout le document. Une chaîne avec "@" EST un email, qu'elle soit labellisée ou non.

ÉTAPE 2 — SCAN CONTACTS : Relève tout prénom+nom, tout titre RH ("DRH", "Responsable RH", "Chargé de recrutement", "Directeur", "Manager"), toute mention "Contact :", "Référent :", "Candidature à adresser à :", "Pour postuler :", "Envoyer à :".

ÉTAPE 3 — CONSTRUIS le JSON suivant en utilisant ce que tu as trouvé :
- "name" : nom de l'entreprise (logo, en-tête, pied de page, mentions légales)
- "contact_name" : prénom+nom ou titre de la personne de contact trouvée à l'étape 2. Si plusieurs noms → prends le plus proche d'un email. Si aucun nom propre → mets le titre RH trouvé (ex: "Service RH Dupont SA"). JAMAIS null si quoi que ce soit a été trouvé à l'étape 2.
- "contact_email" : premier email trouvé à l'étape 1. JAMAIS null si au moins un "@" existe dans le document.
- "notification_email" : email où envoyer les CV. Si un seul email → même valeur que contact_email. Si plusieurs emails → prendre celui le plus proche du mot "recrutement", "candidature", "RH" ou "contact". JAMAIS null si contact_email est non-null.
- "sector" : secteur d'activité de l'entreprise en 2-3 mots.

RÈGLE ABSOLUE : réponds EXCLUSIVEMENT avec l'objet JSON, rien d'autre. Pas de markdown. Commence par { et termine par }.

{
  "name": "...",
  "contact_name": "...",
  "contact_email": "...",
  "notification_email": "...",
  "sector": "..."
}`,
          },
        ],
      }],
    })

    const text = (response.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Réponse invalide : ' + text.slice(0, 200))

    const parsed = JSON.parse(jsonMatch[0])

    // Fallbacks : notification_email ne doit jamais être vide si un email est trouvé
    if (!parsed.notification_email && parsed.contact_email) {
      parsed.notification_email = parsed.contact_email
    }
    if (!parsed.contact_email && parsed.notification_email) {
      parsed.contact_email = parsed.notification_email
    }

    return res.json({ data: parsed })
  } catch (err) {
    return res.status(200).json({ error: String(err) })
  }
}
