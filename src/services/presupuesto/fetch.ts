import { assertRowObject, readNumber, readOptionalNumber } from '../../utils/core/rowParsers'
import { LIMITE_MENSUAL_DEFAULT } from '../../types/gasto'
import { calcIngresoMensualTotal, SEMANAS_POR_MES } from '../../utils/finanzas'
import { resolveLimiteMensual } from '../../utils/finanzas/resolveLimiteMensual'
import { roundMoney } from '../../utils/core/centavos'
import { supabase } from '../supabase'
import { cachePresupuesto, limiteLocalStorageKey, readCachedPresupuesto } from './cache'
import type { Presupuesto } from './types'

export const PRESUPUESTO_SELECT =
  'limite_mensual, limite_es_manual, sueldo_mensual, ingresos_extras, sueldo_semanal, dia_pago, porcentaje_ahorro' as const

export const PRESUPUESTO_SELECT_LEGACY =
  'limite_mensual, sueldo_semanal, dia_pago, porcentaje_ahorro' as const

export const PRESUPUESTO_SELECT_NO_MANUAL =
  'limite_mensual, sueldo_mensual, ingresos_extras, sueldo_semanal, dia_pago, porcentaje_ahorro' as const

type PresupuestoSelectMode = 'full' | 'no_manual' | 'legacy' | 'minimal'
let presupuestoSelectMode: PresupuestoSelectMode | null = null

export function mapPresupuesto(row: unknown): Presupuesto {
  const data = assertRowObject(row, 'presupuestos')
  const limiteMensual = readNumber(data.limite_mensual)
  if (limiteMensual == null) {
    throw new Error('Fila de presupuesto inválida: limite_mensual')
  }

  let sueldo_mensual = readOptionalNumber(data.sueldo_mensual)
  let sueldo_semanal = readOptionalNumber(data.sueldo_semanal)
  const ingresos_extras = readOptionalNumber(data.ingresos_extras) ?? 0

  if (sueldo_mensual == null && sueldo_semanal != null) {
    sueldo_mensual = roundMoney(sueldo_semanal * SEMANAS_POR_MES)
  }
  if (sueldo_semanal == null && sueldo_mensual != null) {
    sueldo_semanal = roundMoney(sueldo_mensual / SEMANAS_POR_MES)
  }

  return {
    limite_mensual: limiteMensual,
    limite_es_manual: data.limite_es_manual === true,
    sueldo_mensual,
    ingresos_extras,
    sueldo_semanal,
    dia_pago: readOptionalNumber(data.dia_pago),
    porcentaje_ahorro: readOptionalNumber(data.porcentaje_ahorro),
  }
}

export function getIngresoMensualTotal(presupuesto: Presupuesto): number | null {
  if (presupuesto.sueldo_mensual == null) return null
  return calcIngresoMensualTotal(
    presupuesto.sueldo_mensual,
    presupuesto.ingresos_extras ?? 0,
  )
}

export async function fetchPresupuestoRow(userId: string) {
  if (presupuestoSelectMode === 'full') {
    return supabase
      .from('presupuestos')
      .select(PRESUPUESTO_SELECT)
      .eq('user_id', userId)
      .maybeSingle()
  }

  if (presupuestoSelectMode === 'no_manual') {
    const withoutManual = await supabase
      .from('presupuestos')
      .select(PRESUPUESTO_SELECT_NO_MANUAL)
      .eq('user_id', userId)
      .maybeSingle()
    if (!withoutManual.error) {
      return {
        data: withoutManual.data
          ? { ...withoutManual.data, limite_es_manual: false }
          : null,
        error: null,
      }
    }
    presupuestoSelectMode = null
  }

  if (presupuestoSelectMode === 'legacy') {
    const withOnboarding = await supabase
      .from('presupuestos')
      .select(PRESUPUESTO_SELECT_LEGACY)
      .eq('user_id', userId)
      .maybeSingle()
    if (!withOnboarding.error) {
      return {
        data: withOnboarding.data
          ? { ...withOnboarding.data, sueldo_mensual: null, ingresos_extras: 0, limite_es_manual: false }
          : null,
        error: null,
      }
    }
    presupuestoSelectMode = null
  }

  if (presupuestoSelectMode === 'minimal') {
    const fallback = await supabase
      .from('presupuestos')
      .select('limite_mensual')
      .eq('user_id', userId)
      .maybeSingle()
    if (fallback.error || !fallback.data) return fallback
    return {
      data: {
        ...fallback.data,
        limite_es_manual: false,
        sueldo_mensual: null,
        ingresos_extras: 0,
        sueldo_semanal: null,
        dia_pago: null,
        porcentaje_ahorro: null,
      },
      error: null,
    }
  }

  const withManual = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  if (!withManual.error) {
    presupuestoSelectMode = 'full'
    return withManual
  }

  const withoutManual = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT_NO_MANUAL)
    .eq('user_id', userId)
    .maybeSingle()

  if (!withoutManual.error) {
    presupuestoSelectMode = 'no_manual'
    return {
      data: withoutManual.data
        ? { ...withoutManual.data, limite_es_manual: false }
        : null,
      error: null,
    }
  }

  const withOnboarding = await supabase
    .from('presupuestos')
    .select(PRESUPUESTO_SELECT_LEGACY)
    .eq('user_id', userId)
    .maybeSingle()

  if (!withOnboarding.error) {
    presupuestoSelectMode = 'legacy'
    return {
      data: withOnboarding.data
        ? { ...withOnboarding.data, sueldo_mensual: null, ingresos_extras: 0, limite_es_manual: false }
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

  presupuestoSelectMode = 'minimal'
  return {
    data: {
      ...fallback.data,
      limite_es_manual: false,
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

  try {
    const cachedLimite = localStorage.getItem(limiteLocalStorageKey(userId))
    if (cachedLimite) return Number(cachedLimite)
  } catch {
    /* storage bloqueado o cuota agotada */
  }

  return LIMITE_MENSUAL_DEFAULT
}
