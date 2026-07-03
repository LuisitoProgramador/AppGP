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
}

export interface OnboardingTarjeta {
  nombre: string
  limite_credito: number | null
  dia_corte: number | null
  saldo_actual: number
}

export interface OnboardingCuentaLiquida {
  nombre: string
  saldo_actual: number
}

export interface OnboardingData {
  sueldoMensual: number
  ingresosExtras: number
  diaPago: number
  porcentajeAhorro: number
  gastosFijos: OnboardingGastoFijo[]
  tarjetas: OnboardingTarjeta[]
  cuentasLiquidas: OnboardingCuentaLiquida[]
}

export function guessCategoria(descripcion: string): (typeof CATEGORIAS)[number] {
  const lower = descripcion.toLowerCase()
  if (/netflix|spotify|disney|hbo|prime|suscri|apple tv|youtube/.test(lower)) {
    return 'Suscripciones'
  }
  if (/renta|internet|luz|agua|gas|casa|hipoteca|tel[eé]fono/.test(lower)) {
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
  const sueldoSemanal = calcSueldoSemanalDesdeMensual(data.sueldoMensual)
  const limiteMensual = calcLimiteMensual(
    data.sueldoMensual,
    data.porcentajeAhorro,
    data.ingresosExtras,
  )

  const { error: presupuestoError } = await savePresupuesto(userId, {
    limite_mensual: limiteMensual,
    sueldo_mensual: data.sueldoMensual,
    ingresos_extras: data.ingresosExtras,
    sueldo_semanal: sueldoSemanal,
    dia_pago: data.diaPago,
    porcentaje_ahorro: data.porcentajeAhorro,
  })
  if (presupuestoError) return { error: presupuestoError }

  const { error: efectivoError } = await ensureCuentaEfectivo(userId)
  if (efectivoError) return { error: efectivoError }

  for (const gasto of data.gastosFijos) {
    const { error } = await createGastoRecurrente({
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      categoria: gasto.categoria,
      dia_mes: gasto.dia_mes,
    })
    if (error) return { error }
  }

  for (const cuenta of data.cuentasLiquidas) {
    const input: CuentaInput = {
      nombre: cuenta.nombre,
      tipo: 'debito',
      saldo_actual: cuenta.saldo_actual,
    }
    const { error } = await createCuenta(userId, input)
    if (error) return { error }
  }

  for (const tarjeta of data.tarjetas) {
    const input: CuentaInput = {
      nombre: tarjeta.nombre,
      tipo: 'credito',
      saldo_actual: tarjeta.saldo_actual,
      limite_credito: tarjeta.limite_credito,
      dia_corte: tarjeta.dia_corte,
    }
    const { error } = await createCuenta(userId, input)
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

  const { error: addError } = await addAhorroToMeta(userId, meta.id, monto, meta.monto_actual)
  return addError
}
