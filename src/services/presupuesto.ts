import { LIMITE_MENSUAL_DEFAULT } from '../types/gasto'
import {
  calcEstrategiaFinanciera,
  calcIngresoMensualTotal,
  SEMANAS_POR_MES,
} from '../utils/finanzas'
import { supabase } from './supabase'

export interface Presupuesto {
  limite_mensual: number
  sueldo_mensual: number | null
  ingresos_extras: number | null
  sueldo_semanal: number | null
  dia_pago: number | null
  porcentaje_ahorro: number | null
}

const PRESUPUESTO_SELECT =
  'limite_mensual, sueldo_mensual, ingresos_extras, sueldo_semanal, dia_pago, porcentaje_ahorro' as const

const PRESUPUESTO_SELECT_LEGACY =
  'limite_mensual, sueldo_semanal, dia_pago, porcentaje_ahorro' as const

function limiteLocalStorageKey(userId: string) {
  return `presupuesto_limite_${userId}`
}

function configLocalStorageKey(userId: string) {
  return `presupuesto_config_${userId}`
}

function mapPresupuesto(row: Record<string, unknown>): Presupuesto {
  const sueldoMensualRaw = row.sueldo_mensual
  const sueldoSemanalRaw = row.sueldo_semanal
  const ingresosExtrasRaw = row.ingresos_extras

  let sueldo_mensual =
    sueldoMensualRaw != null ? Number(sueldoMensualRaw) : null
  let sueldo_semanal =
    sueldoSemanalRaw != null ? Number(sueldoSemanalRaw) : null
  const ingresos_extras =
    ingresosExtrasRaw != null ? Number(ingresosExtrasRaw) : 0

  if (sueldo_mensual == null && sueldo_semanal != null) {
    sueldo_mensual = Math.round(sueldo_semanal * SEMANAS_POR_MES * 100) / 100
  }
  if (sueldo_semanal == null && sueldo_mensual != null) {
    sueldo_semanal = Math.round((sueldo_mensual / SEMANAS_POR_MES) * 100) / 100
  }

  return {
    limite_mensual: Number(row.limite_mensual),
    sueldo_mensual,
    ingresos_extras,
    sueldo_semanal,
    dia_pago: row.dia_pago != null ? Number(row.dia_pago) : null,
    porcentaje_ahorro:
      row.porcentaje_ahorro != null ? Number(row.porcentaje_ahorro) : null,
  }
}

function cachePresupuesto(userId: string, presupuesto: Presupuesto) {
  try {
    localStorage.setItem(limiteLocalStorageKey(userId), String(presupuesto.limite_mensual))
    localStorage.setItem(configLocalStorageKey(userId), JSON.stringify(presupuesto))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
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

export function getIngresoMensualTotal(presupuesto: Presupuesto): number | null {
  if (presupuesto.sueldo_mensual == null) return null
  return calcIngresoMensualTotal(
    presupuesto.sueldo_mensual,
    presupuesto.ingresos_extras ?? 0,
  )
}

export function resolveLimiteMensual(presupuesto: Presupuesto): number {
  if (presupuesto.sueldo_mensual != null && presupuesto.porcentaje_ahorro != null) {
    return calcEstrategiaFinanciera({
      sueldoMensual: presupuesto.sueldo_mensual,
      ingresosExtras: presupuesto.ingresos_extras ?? 0,
      porcentajeAhorro: presupuesto.porcentaje_ahorro,
    }).disponibleParaGasto
  }
  return presupuesto.limite_mensual
}

async function fetchPresupuestoRow(userId: string) {
  const withIngresos = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  if (!withIngresos.error) return withIngresos

  const withOnboarding = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT_LEGACY)
    .eq('user_id', userId)
    .maybeSingle()

  if (!withOnboarding.error) {
    return {
      data: withOnboarding.data
        ? { ...withOnboarding.data, sueldo_mensual: null, ingresos_extras: 0 }
        : null,
      error: null,
    }
  }

  const fallback = await supabase
    .from('presupuestos')
    .select('limite_mensual')
    .eq('user_id', userId)
    .maybeSingle()

  if (fallback.error || !fallback.data) return fallback

  return {
    data: {
      ...fallback.data,
      sueldo_mensual: null,
      ingresos_extras: 0,
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
    return resolveLimiteMensual(presupuesto)
  }

  const cachedLimite = localStorage.getItem(limiteLocalStorageKey(userId))
  if (cachedLimite) return Number(cachedLimite)

  return LIMITE_MENSUAL_DEFAULT
}

export async function savePresupuesto(
  userId: string,
  input: {
    limite_mensual: number
    sueldo_mensual?: number | null
    ingresos_extras?: number | null
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

  if (input.sueldo_mensual !== undefined) row.sueldo_mensual = input.sueldo_mensual
  if (input.ingresos_extras !== undefined) row.ingresos_extras = input.ingresos_extras
  if (input.sueldo_semanal !== undefined) row.sueldo_semanal = input.sueldo_semanal
  if (input.dia_pago !== undefined) row.dia_pago = input.dia_pago
  if (input.porcentaje_ahorro !== undefined) row.porcentaje_ahorro = input.porcentaje_ahorro

  const existing = await getPresupuesto(userId)

  cachePresupuesto(userId, {
    limite_mensual: input.limite_mensual,
    sueldo_mensual: input.sueldo_mensual ?? existing?.sueldo_mensual ?? null,
    ingresos_extras: input.ingresos_extras ?? existing?.ingresos_extras ?? 0,
    sueldo_semanal: input.sueldo_semanal ?? existing?.sueldo_semanal ?? null,
    dia_pago: input.dia_pago ?? existing?.dia_pago ?? null,
    porcentaje_ahorro: input.porcentaje_ahorro ?? existing?.porcentaje_ahorro ?? null,
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
    sueldo_mensual: existing?.sueldo_mensual ?? null,
    ingresos_extras: existing?.ingresos_extras ?? 0,
    sueldo_semanal: existing?.sueldo_semanal ?? null,
    dia_pago: existing?.dia_pago ?? null,
    porcentaje_ahorro: existing?.porcentaje_ahorro ?? null,
  })
}

export interface PresupuestoFinancieroInput {
  sueldo_mensual: number
  ingresos_extras: number
  porcentaje_ahorro: number
  dia_pago: number
}

export async function savePresupuestoFinanciero(
  userId: string,
  input: PresupuestoFinancieroInput,
): Promise<{ error: string | null; presupuesto: Presupuesto | null }> {
  const ingresosExtras = input.ingresos_extras ?? 0
  const estrategia = calcEstrategiaFinanciera({
    sueldoMensual: input.sueldo_mensual,
    ingresosExtras,
    porcentajeAhorro: input.porcentaje_ahorro,
  })

  const { error } = await savePresupuesto(userId, {
    limite_mensual: estrategia.disponibleParaGasto,
    sueldo_mensual: input.sueldo_mensual,
    ingresos_extras: ingresosExtras,
    sueldo_semanal: estrategia.sueldoSemanal,
    dia_pago: input.dia_pago,
    porcentaje_ahorro: input.porcentaje_ahorro,
  })

  if (error) return { error, presupuesto: null }

  const presupuesto: Presupuesto = {
    limite_mensual: estrategia.disponibleParaGasto,
    sueldo_mensual: input.sueldo_mensual,
    ingresos_extras: ingresosExtras,
    sueldo_semanal: estrategia.sueldoSemanal,
    dia_pago: input.dia_pago,
    porcentaje_ahorro: input.porcentaje_ahorro,
  }

  return { error: null, presupuesto }
}
