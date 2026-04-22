import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function reloadSchema(): Promise<void> {
  await fetch(`${SUPABASE_URL}/functions/v1/reload-schema`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
}

export async function rpcWithRetry<T>(
  fn: string,
  params: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, params)
  if (!error) return data as T

  if (error.message.includes('schema cache')) {
    await reloadSchema()
    await new Promise(r => setTimeout(r, 800))
    const retry = await supabase.rpc(fn, params)
    if (retry.error) throw new Error(retry.error.message)
    return retry.data as T
  }

  throw new Error(error.message)
}
