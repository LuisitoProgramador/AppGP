import { formatMonthLabel, getMonthRange, isCurrentMonth, shiftMonth } from './date'
import type { MetaAhorro } from '../types/metaAhorro'

export interface ResumenFinMes {
  mesLabel: string
  gastoTotal: number
  variacionPct: number | null
  metasCumplidas: number
  metasTotal: number
}

export function shouldShowResumenFinMes(selectedMonth: Date, now = new Date()): boolean {
  if (!isCurrentMonth(selectedMonth)) return true
  return now.getDate() <= 3
}

export function mesParaResumenFinMes(selectedMonth: Date, now = new Date()): Date {
  if (!isCurrentMonth(selectedMonth)) return selectedMonth
  return shiftMonth(selectedMonth, -1)
}

export function contarMetasCumplidas(metas: MetaAhorro[]): number {
  return metas.filter((meta) => meta.monto_actual >= meta.monto_objetivo).length
}

export function buildResumenFinMes(params: {
  mes: Date
  gastoTotalMes: number
  gastoTotalMesAnterior: number | null
  metas: MetaAhorro[]
}): ResumenFinMes {
  const { mes, gastoTotalMes, gastoTotalMesAnterior, metas } = params

  let variacionPct: number | null = null
  if (gastoTotalMesAnterior != null && gastoTotalMesAnterior > 0) {
    variacionPct = Math.round(
      ((gastoTotalMes - gastoTotalMesAnterior) / gastoTotalMesAnterior) * 100,
    )
  }

  return {
    mesLabel: formatMonthLabel(mes),
    gastoTotal: gastoTotalMes,
    variacionPct,
    metasCumplidas: contarMetasCumplidas(metas),
    metasTotal: metas.length,
  }
}

export function getMonthRangeIso(mes: Date) {
  const { inicio, fin } = getMonthRange(mes)
  return { inicio: inicio.toISOString(), fin: fin.toISOString() }
}
