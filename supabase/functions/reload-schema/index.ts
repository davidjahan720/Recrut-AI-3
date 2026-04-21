const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')
    if (!dbUrl) throw new Error('SUPABASE_DB_URL non disponible')

    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts')
    const client = new Client(dbUrl)
    await client.connect()
    await client.queryObject(`SELECT pg_notify('pgrst', 'reload schema')`)
    await client.end()

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
