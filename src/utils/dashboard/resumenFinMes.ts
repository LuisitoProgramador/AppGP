import { formatMonthLabel, getMonthBucketBounds, isCurrentMonth, shiftMonth } from '../date'
import type { MetaAhorro } from '../../types/metaAhorro'

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

export function mesParaResumenFinMes(selectedMonth: Date, _now = new Date()): Date {
  if (!isCurrentMonth(selectedMonth)) return selectedMonth
  return shiftMonth(selectedMonth, -1)
}

export function contarMetasCumplidas(metas: MetaAhorro[]): number {
  let cumplidas = 0
  for (const meta of metas) {
    if (meta.monto_actual >= meta.monto_objetivo) cumplidas += 1
  }
  return cumplidas
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

  let metasCumplidas = 0
  for (const meta of metas) {
    if (meta.monto_actual >= meta.monto_objetivo) metasCumplidas += 1
  }

  return {
    mesLabel: formatMonthLabel(mes),
    gastoTotal: gastoTotalMes,
    variacionPct,
    metasCumplidas,
    metasTotal: metas.length,
  }
}

export function getMonthRangeIso(mes: Date) {
  return getMonthBucketBounds(mes)
}
