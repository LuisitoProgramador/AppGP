import type { GastoRecurrente } from '../types/gasto'
import { APP_TIMEZONE, getCalendarDay, getMonthRange } from './date'
import { alreadyRegisteredThisMonth } from './recurrentesPolicy'

/** Suma recurrentes aún no registrados en el mes (reserva obligación pendiente). */
export function sumRecibosPendientes(
  recurrentes: GastoRecurrente[],
  now: Date = new Date(),
): number {
  return recurrentes
    .filter((item) => !alreadyRegisteredThisMonth(item.ultimo_registro, now))
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
  timeZone = APP_TIMEZONE,
): number {
  return rows
    .filter((row) => {
      const fecha = new Date(row.fecha)
      if (fecha < periodoInicio || fecha >= periodoFin) return false
      return getCalendarDay(fecha, timeZone) > diaActual
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
  // gastoTotal ya incluye todas las cuotas MSI del mes; msiPendientes es solo informativo.
  const disponible = disponibleBruto - recibosPendientes
  const presupuestoDiario = diasRestantes > 0 ? disponible / diasRestantes : 0

  return {
    disponibleBruto,
    disponible,
    presupuestoDiario,
    recibosPendientes,
    msiPendientes,
  }
}
