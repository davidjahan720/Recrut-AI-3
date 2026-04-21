import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { file_path } = await req.json()
    if (!file_path) throw new Error('file_path manquant')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    fetch(`${supabaseUrl}/storage/v1/object/cvs/${file_path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    }).catch(() => {})

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

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
  "score_threshold": <entier entre 60 et 85>
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
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
