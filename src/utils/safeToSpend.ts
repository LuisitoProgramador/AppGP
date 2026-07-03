import type { GastoRecurrente } from '../types/gasto'

export function sumRecibosPendientes(
  recurrentes: GastoRecurrente[],
  diaActual: number,
): number {
  return recurrentes
    .filter((item) => item.dia_mes > diaActual)
    .reduce((sum, item) => sum + Number(item.monto), 0)
}

export function calcSafeToSpend(params: {
  limiteMensual: number
  gastoTotal: number
  recibosPendientes: number
  diasRestantes: number
}): {
  disponibleBruto: number
  disponible: number
  presupuestoDiario: number
  recibosPendientes: number
} {
  const { limiteMensual, gastoTotal, recibosPendientes, diasRestantes } = params
  const disponibleBruto = limiteMensual - gastoTotal
  const disponible = disponibleBruto - recibosPendientes
  const presupuestoDiario = diasRestantes > 0 ? disponible / diasRestantes : 0

  return {
    disponibleBruto,
    disponible,
    presupuestoDiario,
    recibosPendientes,
  }
}
