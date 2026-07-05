import { PORCENTAJE_AHORRO_DEFAULT, validatePorcentajeAhorro } from '../../constants/porcentajeAhorro'
import { calcEstrategiaFinanciera } from '../../utils/finanzas'
import { limiteTrasActualizarEstrategia } from '../../utils/finanzas/resolveLimiteMensual'
import { aplicarLimitesRegla503020 } from '../presupuestoCategorias'
import { syncMetasAnualesConPresupuesto } from '../metasAhorro/sync'
import { supabase } from '../supabase'
import { cachePresupuesto } from './cache'
import { getIngresoMensualTotal, getPresupuesto } from './fetch'
import type { Presupuesto, PresupuestoFinancieroInput } from './types'

function syncLimites503020(userId: string, presupuesto: Presupuesto): void {
  const ingreso = getIngresoMensualTotal(presupuesto)
  if (ingreso != null && ingreso > 0) {
    aplicarLimitesRegla503020(
      userId,
      ingreso,
      presupuesto.porcentaje_ahorro ?? PORCENTAJE_AHORRO_DEFAULT,
    )
  }
}

export async function savePresupuesto(
  userId: string,
  input: {
    limite_mensual: number
    limite_es_manual?: boolean
    sueldo_mensual?: number | null
    ingresos_extras?: number | null
    sueldo_semanal?: number | null
    dia_pago?: number | null
    porcentaje_ahorro?: number | null
  },
  existingPresupuesto?: Presupuesto | null,
): Promise<{ error: string | null }> {
  if (input.porcentaje_ahorro !== undefined && input.porcentaje_ahorro != null) {
    const porcentajeError = validatePorcentajeAhorro(input.porcentaje_ahorro)
    if (porcentajeError) return { error: porcentajeError }
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    limite_mensual: input.limite_mensual,
    updated_at: new Date().toISOString(),
  }

  if (input.limite_es_manual !== undefined) row.limite_es_manual = input.limite_es_manual
  if (input.sueldo_mensual !== undefined) row.sueldo_mensual = input.sueldo_mensual
  if (input.ingresos_extras !== undefined) row.ingresos_extras = input.ingresos_extras
  if (input.sueldo_semanal !== undefined) row.sueldo_semanal = input.sueldo_semanal
  if (input.dia_pago !== undefined) row.dia_pago = input.dia_pago
  if (input.porcentaje_ahorro !== undefined) row.porcentaje_ahorro = input.porcentaje_ahorro

  const existing = existingPresupuesto ?? (await getPresupuesto(userId))

  const { error } = await supabase.from('presupuestos').upsert(row, { onConflict: 'user_id' })

  if (!error) {
    const cached: Presupuesto = {
      limite_mensual: input.limite_mensual,
      limite_es_manual: input.limite_es_manual ?? existing?.limite_es_manual ?? false,
      sueldo_mensual: input.sueldo_mensual ?? existing?.sueldo_mensual ?? null,
      ingresos_extras: input.ingresos_extras ?? existing?.ingresos_extras ?? 0,
      sueldo_semanal: input.sueldo_semanal ?? existing?.sueldo_semanal ?? null,
      dia_pago: input.dia_pago ?? existing?.dia_pago ?? null,
      porcentaje_ahorro: input.porcentaje_ahorro ?? existing?.porcentaje_ahorro ?? null,
    }
    cachePresupuesto(userId, cached)
    syncLimites503020(userId, cached)
  }

  return { error: error?.message ?? null }
}

export async function savePresupuestoFinanciero(
  userId: string,
  input: PresupuestoFinancieroInput,
): Promise<{ error: string | null; presupuesto: Presupuesto | null; limiteManualPreservado: boolean }> {
  const porcentajeError = validatePorcentajeAhorro(input.porcentaje_ahorro)
  if (porcentajeError) {
    return { error: porcentajeError, presupuesto: null, limiteManualPreservado: false }
  }

  const ingresosExtras = input.ingresos_extras ?? 0
  const estrategia = calcEstrategiaFinanciera({
    sueldoMensual: input.sueldo_mensual,
    ingresosExtras,
    porcentajeAhorro: input.porcentaje_ahorro,
  })

  const existing = await getPresupuesto(userId)
  const { limite_mensual, limite_es_manual } = limiteTrasActualizarEstrategia(
    {
      limite_mensual: existing?.limite_mensual ?? estrategia.disponibleParaGasto,
      limite_es_manual: existing?.limite_es_manual ?? false,
    },
    estrategia.disponibleParaGasto,
  )

  const { error } = await savePresupuesto(
    userId,
    {
      limite_mensual,
      limite_es_manual,
      sueldo_mensual: input.sueldo_mensual,
      ingresos_extras: ingresosExtras,
      sueldo_semanal: estrategia.sueldoSemanal,
      dia_pago: input.dia_pago,
      porcentaje_ahorro: input.porcentaje_ahorro,
    },
    existing,
  )

  if (error) return { error, presupuesto: null, limiteManualPreservado: false }

  const presupuesto: Presupuesto = {
    limite_mensual,
    limite_es_manual,
    sueldo_mensual: input.sueldo_mensual,
    ingresos_extras: ingresosExtras,
    sueldo_semanal: estrategia.sueldoSemanal,
    dia_pago: input.dia_pago,
    porcentaje_ahorro: input.porcentaje_ahorro,
  }

  await syncMetasAnualesConPresupuesto(userId, {
    sueldo_mensual: input.sueldo_mensual,
    porcentaje_ahorro: input.porcentaje_ahorro,
    ingresos_extras: ingresosExtras,
  })

  return { error: null, presupuesto, limiteManualPreservado: limite_es_manual }
}

export async function applyLimiteCalculado(
  userId: string,
): Promise<{ error: string | null; limite: number | null }> {
  const existing = await getPresupuesto(userId)
  if (!existing?.sueldo_mensual || existing.porcentaje_ahorro == null) {
    return { error: 'Configura sueldo y porcentaje de ahorro antes de aplicar el límite calculado.', limite: null }
  }

  const estrategia = calcEstrategiaFinanciera({
    sueldoMensual: existing.sueldo_mensual,
    ingresosExtras: existing.ingresos_extras ?? 0,
    porcentajeAhorro: existing.porcentaje_ahorro,
  })

  const { error } = await savePresupuesto(userId, {
    limite_mensual: estrategia.disponibleParaGasto,
    limite_es_manual: false,
    sueldo_mensual: existing.sueldo_mensual,
    ingresos_extras: existing.ingresos_extras ?? 0,
    sueldo_semanal: existing.sueldo_semanal,
    dia_pago: existing.dia_pago,
    porcentaje_ahorro: existing.porcentaje_ahorro,
  })

  if (error) return { error, limite: null }
  return { error: null, limite: estrategia.disponibleParaGasto }
}
