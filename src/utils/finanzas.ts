import { semanasRestantesHastaFinDeAno } from './metaCalendario'

export { mesesRestantesEnAnoCalendario, semanasRestantesHastaFinDeAno } from './metaCalendario'

export const SEMANAS_POR_MES = 4.33

export interface EstrategiaFinancieraInput {
  sueldoMensual: number
  ingresosExtras?: number
  porcentajeAhorro: number
}

export interface EstrategiaFinanciera {
  presupuestoTotalMensual: number
  ahorroMensual: number
  disponibleParaGasto: number
  sueldoSemanal: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function calcEstrategiaFinanciera(
  params: EstrategiaFinancieraInput,
): EstrategiaFinanciera {
  const ingresosExtras = params.ingresosExtras ?? 0
  const presupuestoTotalMensual = round2(params.sueldoMensual + ingresosExtras)
  const ahorroMensual = round2(presupuestoTotalMensual * (params.porcentajeAhorro / 100))
  const disponibleParaGasto = round2(presupuestoTotalMensual - ahorroMensual)
  const sueldoSemanal = round2(params.sueldoMensual / SEMANAS_POR_MES)

  return {
    presupuestoTotalMensual,
    ahorroMensual,
    disponibleParaGasto,
    sueldoSemanal,
  }
}

export function calcSueldoSemanalDesdeMensual(sueldoMensual: number): number {
  return round2(sueldoMensual / SEMANAS_POR_MES)
}

export function calcIngresoMensualTotal(
  sueldoMensual: number,
  ingresosExtras = 0,
): number {
  return calcEstrategiaFinanciera({
    sueldoMensual,
    ingresosExtras,
    porcentajeAhorro: 0,
  }).presupuestoTotalMensual
}

export function calcLimiteMensual(
  sueldoMensual: number,
  porcentajeAhorro: number,
  ingresosExtras = 0,
): number {
  return calcEstrategiaFinanciera({
    sueldoMensual,
    ingresosExtras,
    porcentajeAhorro,
  }).disponibleParaGasto
}

/** Ahorro semanal sobre ingreso total (sueldo + extras), alineado con calcEstrategiaFinanciera. */
export function calcPrimerAhorro(
  sueldoMensual: number,
  porcentajeAhorro: number,
  ingresosExtras = 0,
): number {
  const { ahorroMensual } = calcEstrategiaFinanciera({
    sueldoMensual,
    ingresosExtras,
    porcentajeAhorro,
  })
  return round2(ahorroMensual / SEMANAS_POR_MES)
}

/** Meta de ahorro hasta 31 dic: ahorro semanal × semanas restantes del año. */
export function calcMetaObjetivoAnual(
  sueldoMensual: number,
  porcentajeAhorro: number,
  ingresosExtras = 0,
  fecha = new Date(),
): number {
  const ahorroSemanal = calcPrimerAhorro(sueldoMensual, porcentajeAhorro, ingresosExtras)
  const semanas = semanasRestantesHastaFinDeAno(fecha)
  return round2(ahorroSemanal * semanas)
}

export function calcDiferenciaAhorroMensual(
  anterior: EstrategiaFinancieraInput,
  nuevo: EstrategiaFinancieraInput,
): number {
  const prev = calcEstrategiaFinanciera(anterior)
  const next = calcEstrategiaFinanciera(nuevo)
  return round2(next.ahorroMensual - prev.ahorroMensual)
}
