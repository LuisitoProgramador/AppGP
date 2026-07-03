import type { OptimisticGasto } from '../types/gasto'
import { getMonthRange } from './date'

interface ResumenMensual {
  categoria: string
  total: number
}

export function mergeResumenWithOptimistic(
  resumenMensual: ResumenMensual[],
  optimisticGastos: OptimisticGasto[],
  month: Date,
): { monto: number; categoria: string }[] {
  const { inicio, fin } = getMonthRange(month)

  const base = resumenMensual.map((item) => ({
    monto: item.total,
    categoria: item.categoria,
  }))

  const optimistic = optimisticGastos
    .filter((gasto) => {
      const fecha = new Date(gasto.fecha)
      return fecha >= inicio && fecha < fin
    })
    .map((gasto) => ({
      monto: gasto.monto,
      categoria: gasto.categoria,
    }))

  return [...base, ...optimistic]
}

export function filterOptimisticGastos(
  optimisticGastos: OptimisticGasto[],
  month: Date,
  categoria: string,
  busqueda: string,
): OptimisticGasto[] {
  const { inicio, fin } = getMonthRange(month)
  const termino = busqueda.trim().toLowerCase()

  return optimisticGastos.filter((gasto) => {
    const fecha = new Date(gasto.fecha)
    if (fecha < inicio || fecha >= fin) return false
    if (categoria !== 'Todas' && gasto.categoria !== categoria) return false
    if (termino && !gasto.descripcion.toLowerCase().includes(termino)) return false
    return true
  })
}
