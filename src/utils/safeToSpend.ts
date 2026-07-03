import type { GastoRecurrente } from '../types/gasto'
import { getMonthRange } from './date'

export function sumRecibosPendientes(
  recurrentes: GastoRecurrente[],
  diaActual: number,
): number {
  return recurrentes
    .filter((item) => item.dia_mes > diaActual)
    .reduce((sum, item) => sum + Number(item.monto), 0)
}

interface MsiRow {
  monto: number
  fecha: string
}

export function sumMsiPendientesRestoPeriodo(
  rows: MsiRow[],
  diaActual: number,
  periodoInicio: Date,
  periodoFin: Date,
): number {
  return rows
    .filter((row) => {
      const fecha = new Date(row.fecha)
      if (fecha < periodoInicio || fecha >= periodoFin) return false
      return fecha.getDate() > diaActual
    })
    .reduce((sum, row) => sum + Number(row.monto), 0)
}

export function sumMsiPendientesRestoMes(
  rows: MsiRow[],
  diaActual: number,
  mes = new Date(),
): number {
  const { inicio, fin } = getMonthRange(mes)
  return sumMsiPendientesRestoPeriodo(rows, diaActual, inicio, fin)
}

export function calcSafeToSpend(params: {
  limiteMensual: number
  gastoTotal: number
  recibosPendientes: number
  msiPendientes?: number
  diasRestantes: number
}): {
  disponibleBruto: number
  disponible: number
  presupuestoDiario: number
  recibosPendientes: number
  msiPendientes: number
} {
  const { limiteMensual, gastoTotal, recibosPendientes, diasRestantes } = params
  const msiPendientes = params.msiPendientes ?? 0
  const disponibleBruto = limiteMensual - gastoTotal
  const disponible = disponibleBruto - recibosPendientes - msiPendientes
  const presupuestoDiario = diasRestantes > 0 ? disponible / diasRestantes : 0

  return {
    disponibleBruto,
    disponible,
    presupuestoDiario,
    recibosPendientes,
    msiPendientes,
  }
}
