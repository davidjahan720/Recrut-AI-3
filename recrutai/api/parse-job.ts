/// <reference types="node" />
import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 120 }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdf_base64 } = req.body
    if (!pdf_base64) return res.status(400).json({ error: 'pdf_base64 manquant' })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

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
            text: `Analyse cette fiche de poste.

RÈGLE ABSOLUE : réponds EXCLUSIVEMENT avec un objet JSON valide.
Pas de markdown, pas de \`\`\`json, pas de texte avant, pas de texte après.
Commence directement par { et termine par }.

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
}`,
          },
        ],
      }],
    })

    const text = (response.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Reponse invalide')

    const parsed = JSON.parse(jsonMatch[0])
    return res.json({ data: parsed })
  } catch (err) {
    return res.status(200).json({ error: String(err) })
  }
}
