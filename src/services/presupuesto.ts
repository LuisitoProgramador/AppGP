import { LIMITE_MENSUAL_DEFAULT } from '../types/gasto'
import { supabase } from './supabase'

export interface Presupuesto {
  limite_mensual: number
  sueldo_semanal: number | null
  dia_pago: number | null
  porcentaje_ahorro: number | null
}

const PRESUPUESTO_SELECT =
  'limite_mensual, sueldo_semanal, dia_pago, porcentaje_ahorro' as const

function limiteLocalStorageKey(userId: string) {
  return `presupuesto_limite_${userId}`
}

function configLocalStorageKey(userId: string) {
  return `presupuesto_config_${userId}`
}

function mapPresupuesto(row: Record<string, unknown>): Presupuesto {
  return {
    limite_mensual: Number(row.limite_mensual),
    sueldo_semanal: row.sueldo_semanal != null ? Number(row.sueldo_semanal) : null,
    dia_pago: row.dia_pago != null ? Number(row.dia_pago) : null,
    porcentaje_ahorro:
      row.porcentaje_ahorro != null ? Number(row.porcentaje_ahorro) : null,
  }
}

function cachePresupuesto(userId: string, presupuesto: Presupuesto) {
  localStorage.setItem(limiteLocalStorageKey(userId), String(presupuesto.limite_mensual))
  localStorage.setItem(configLocalStorageKey(userId), JSON.stringify(presupuesto))
}

function readCachedPresupuesto(userId: string): Presupuesto | null {
  try {
    const raw = localStorage.getItem(configLocalStorageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as Presupuesto
  } catch {
    return null
  }
}

async function fetchPresupuestoRow(userId: string) {
  const withOnboarding = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  if (!withOnboarding.error) return withOnboarding

  const fallback = await supabase
    .from('presupuestos')
    .select('limite_mensual')
    .eq('user_id', userId)
    .maybeSingle()

  if (fallback.error || !fallback.data) return fallback

  return {
    data: {
      ...fallback.data,
      sueldo_semanal: null,
      dia_pago: null,
      porcentaje_ahorro: null,
    },
    error: null,
  }
}

export async function getPresupuesto(userId: string): Promise<Presupuesto | null> {
  const { data } = await fetchPresupuestoRow(userId)

  if (data) {
    const presupuesto = mapPresupuesto(data)
    cachePresupuesto(userId, presupuesto)
    return presupuesto
  }

  return readCachedPresupuesto(userId)
}

export async function getLimiteMensual(userId: string): Promise<number> {
  const presupuesto = await getPresupuesto(userId)
  if (presupuesto?.limite_mensual != null) {
    return presupuesto.limite_mensual
  }

  const cachedLimite = localStorage.getItem(limiteLocalStorageKey(userId))
  if (cachedLimite) return Number(cachedLimite)

  return LIMITE_MENSUAL_DEFAULT
}

export async function savePresupuesto(
  userId: string,
  input: {
    limite_mensual: number
    sueldo_semanal?: number | null
    dia_pago?: number | null
    porcentaje_ahorro?: number | null
  },
): Promise<{ error: string | null }> {
  const row: Record<string, unknown> = {
    user_id: userId,
    limite_mensual: input.limite_mensual,
    updated_at: new Date().toISOString(),
  }

  if (input.sueldo_semanal !== undefined) row.sueldo_semanal = input.sueldo_semanal
  if (input.dia_pago !== undefined) row.dia_pago = input.dia_pago
  if (input.porcentaje_ahorro !== undefined) row.porcentaje_ahorro = input.porcentaje_ahorro

  cachePresupuesto(userId, {
    limite_mensual: input.limite_mensual,
    sueldo_semanal: input.sueldo_semanal ?? null,
    dia_pago: input.dia_pago ?? null,
    porcentaje_ahorro: input.porcentaje_ahorro ?? null,
  })

  const { error } = await supabase.from('presupuestos').upsert(row, { onConflict: 'user_id' })

  return { error: error?.message ?? null }
}

export async function saveLimiteMensual(
  userId: string,
  limite: number,
): Promise<{ error: string | null }> {
  const existing = await getPresupuesto(userId)

  return savePresupuesto(userId, {
    limite_mensual: limite,
    sueldo_semanal: existing?.sueldo_semanal ?? null,
    dia_pago: existing?.dia_pago ?? null,
    porcentaje_ahorro: existing?.porcentaje_ahorro ?? null,
  })
}
