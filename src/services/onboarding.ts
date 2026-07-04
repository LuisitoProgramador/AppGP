import { validatePorcentajeAhorro } from '../constants/porcentajeAhorro'
import { createCuenta, ensureCuentaEfectivo } from './cuentas'
import { createGastoRecurrente } from './gastosRecurrentes'
import { addAhorroToMeta, createMetaAhorro } from './metasAhorro'
import { savePresupuesto } from './presupuesto'
import { supabase } from './supabase'
import type { CuentaInput } from '../types/cuenta'
import { CATEGORIAS } from '../types/gasto'
import {
  calcLimiteMensual,
  calcMetaObjetivoAnual,
  calcPrimerAhorro,
  calcSueldoSemanalDesdeMensual,
} from '../utils/finanzas'

export {
  calcIngresoMensualTotal,
  calcLimiteMensual,
  calcMetaObjetivoAnual,
  calcPrimerAhorro,
  calcSueldoSemanalDesdeMensual,
  SEMANAS_POR_MES,
} from '../utils/finanzas'

export interface OnboardingGastoFijo {
  descripcion: string
  monto: number
  categoria: string
  dia_mes: number
  cuenta_id: string | null
}

export interface OnboardingTarjeta {
  draftId: string
  nombre: string
  limite_credito: number | null
  dia_corte: number | null
  saldo_actual: number
}

export interface OnboardingCuentaLiquida {
  draftId: string
  nombre: string
  saldo_actual: number
}

export interface OnboardingData {
  sueldoMensual: number
  diaPago: number
  porcentajeAhorro: number
  gastosFijos: OnboardingGastoFijo[]
  tarjetas: OnboardingTarjeta[]
  cuentasLiquidas: OnboardingCuentaLiquida[]
}

const SUSCRIPCIONES_REGEX = /netflix|spotify|disney|hbo|prime|suscri|apple tv|youtube/
const CASA_REGEX = /renta|internet|luz|agua|gas|casa|hipoteca|tel[eé]fono/

export function guessCategoria(descripcion: string): (typeof CATEGORIAS)[number] {
  const lower = descripcion.toLowerCase()
  if (SUSCRIPCIONES_REGEX.test(lower)) {
    return 'Suscripciones'
  }
  if (CASA_REGEX.test(lower)) {
    return 'Casa'
  }
  return 'Otros'
}

export async function checkNeedsOnboarding(userId: string): Promise<boolean> {
  const [presupuestoRes, cuentasRes] = await Promise.all([
    supabase.from('presupuestos').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('cuentas').select('id').eq('user_id', userId).limit(1),
  ])

  const hasPresupuesto = presupuestoRes.data != null
  const hasCuentas = (cuentasRes.data?.length ?? 0) > 0

  return !hasPresupuesto && !hasCuentas
}

export async function completeOnboarding(
  userId: string,
  data: OnboardingData,
): Promise<{ error: string | null }> {
  const porcentajeError = validatePorcentajeAhorro(data.porcentajeAhorro)
  if (porcentajeError) return { error: porcentajeError }

  const sueldoSemanal = calcSueldoSemanalDesdeMensual(data.sueldoMensual)
  const limiteMensual = calcLimiteMensual(data.sueldoMensual, data.porcentajeAhorro)

  const { error: presupuestoError } = await savePresupuesto(userId, {
    limite_mensual: limiteMensual,
    sueldo_mensual: data.sueldoMensual,
    ingresos_extras: 0,
    sueldo_semanal: sueldoSemanal,
    dia_pago: data.diaPago,
    porcentaje_ahorro: data.porcentajeAhorro,
  })
  if (presupuestoError) return { error: presupuestoError }

  const { error: efectivoError, data: efectivo } = await ensureCuentaEfectivo(userId)
  if (efectivoError) return { error: efectivoError }

  const cuentaIdByDraft = new Map<string, string>()

  const liquidasResults = await Promise.all(
    data.cuentasLiquidas.map(async (cuenta) => {
      const input: CuentaInput = {
        nombre: cuenta.nombre,
        tipo: 'debito',
        saldo_actual: cuenta.saldo_actual,
      }
      const { data: created, error } = await createCuenta(userId, input)
      return { draftId: cuenta.draftId, created, error }
    }),
  )

  for (const result of liquidasResults) {
    if (result.error) return { error: result.error }
    if (!result.created) return { error: 'No se pudo crear la cuenta.' }
    cuentaIdByDraft.set(result.draftId, result.created.id)
  }

  const tarjetasResults = await Promise.all(
    data.tarjetas.map(async (tarjeta) => {
      const input: CuentaInput = {
        nombre: tarjeta.nombre,
        tipo: 'credito',
        saldo_actual: tarjeta.saldo_actual,
        limite_credito: tarjeta.limite_credito,
        dia_corte: tarjeta.dia_corte,
      }
      const { data: created, error } = await createCuenta(userId, input)
      return { draftId: tarjeta.draftId, created, error }
    }),
  )

  for (const result of tarjetasResults) {
    if (result.error) return { error: result.error }
    if (!result.created) return { error: 'No se pudo crear la tarjeta.' }
    cuentaIdByDraft.set(result.draftId, result.created.id)
  }

  const defaultCuentaId = efectivo?.id ?? null

  for (const gasto of data.gastosFijos) {
    const resolvedCuentaId = gasto.cuenta_id
      ? cuentaIdByDraft.get(gasto.cuenta_id) ?? defaultCuentaId
      : defaultCuentaId

    const { error } = await createGastoRecurrente({
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      categoria: gasto.categoria,
      dia_mes: gasto.dia_mes,
      cuenta_id: resolvedCuentaId,
    })
    if (error) return { error }
  }

  const ahorroError = await registrarPrimerAhorro(userId, data)
  if (ahorroError) return { error: ahorroError }

  return { error: null }
}

export async function registrarPrimerAhorro(
  userId: string,
  data: OnboardingData,
): Promise<string | null> {
  const monto = calcPrimerAhorro(data.sueldoMensual, data.porcentajeAhorro)
  if (monto <= 0) return null

  const objetivo = calcMetaObjetivoAnual(data.sueldoMensual, data.porcentajeAhorro)

  const { data: meta, error: createError } = await createMetaAhorro(userId, {
    nombre: 'Mi ahorro semanal',
    monto_objetivo: Math.max(objetivo, monto),
  })

  if (createError || !meta) return createError ?? 'No se pudo crear la meta de ahorro.'

  const { error: addError } = await addAhorroToMeta(userId, meta.id, monto)
  return addError
}
