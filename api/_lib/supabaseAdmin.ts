import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service role para uso EXCLUSIVO en funciones server-side
 * (cron). Omite RLS, así que nunca debe exponerse al navegador.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Faltan variables de Supabase (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
