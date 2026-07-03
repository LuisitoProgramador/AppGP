import { LIMITE_MENSUAL_DEFAULT } from '../types/gasto'
import { supabase } from './supabase'

function localStorageKey(userId: string) {
  return `presupuesto_limite_${userId}`
}

export async function getLimiteMensual(userId: string): Promise<number> {
  const { data } = await supabase
    .from('presupuestos')
    .select('limite_mensual')
    .eq('user_id', userId)
    .maybeSingle()

  if (data?.limite_mensual != null) {
    localStorage.setItem(localStorageKey(userId), String(data.limite_mensual))
    return Number(data.limite_mensual)
  }

  const cached = localStorage.getItem(localStorageKey(userId))
  if (cached) return Number(cached)

  return LIMITE_MENSUAL_DEFAULT
}

export async function saveLimiteMensual(
  userId: string,
  limite: number,
): Promise<{ error: string | null }> {
  localStorage.setItem(localStorageKey(userId), String(limite))

  const { error } = await supabase.from('presupuestos').upsert(
    {
      user_id: userId,
      limite_mensual: limite,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  return { error: error?.message ?? null }
}
