import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pdf_base64 } = await req.json()
    if (!pdf_base64) throw new Error('pdf_base64 manquant')

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
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
            text: `Analyse cette fiche de poste et extrais les informations suivantes. Reponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou apres :
{
  "company_name": "Nom exact de l'entreprise ou du client",
  "title": "Intitule exact du poste",
  "location": "Ville ou region (ex: Paris, Lyon, Remote)",
  "contract_type": "Un parmi exactement : CDI, CDD, Alternance, Stage, Freelance",
  "description": "Description complete du poste et profil recherche en 300 mots max",
  "score_threshold": 70
}`,
          },
        ],
      }],
    })

    const text = (response.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Reponse invalide')

    const parsed = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
