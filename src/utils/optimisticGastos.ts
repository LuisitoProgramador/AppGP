import type { OptimisticGasto, PendingGasto } from '../types/gasto'
import { isFechaInMonth } from './date'

interface ResumenMensual {
  categoria: string
  total: number
}

interface ResumenLineItem {
  monto: number
  categoria: string
  fecha: string
}

export function expandPendingToLineItems(
  pending: PendingGasto,
): ResumenLineItem[] {
  if (pending.msiInstallments?.length) {
    return pending.msiInstallments.map((row) => ({
      monto: row.monto,
      categoria: row.categoria,
      fecha: row.fecha,
    }))
  }

  return [
    {
      monto: pending.monto,
      categoria: pending.categoria,
      fecha: pending.fecha,
    },
  ]
}

/** Evita duplicar filas cuando el pendiente ya se muestra como optimista. */
export function filterPendingNotInOptimistic(
  pending: PendingGasto[],
  optimisticGastos: OptimisticGasto[],
): PendingGasto[] {
  const optimisticIds = new Set(optimisticGastos.map((gasto) => gasto.tempId))
  return pending.filter(
    (item) => !item.optimisticTempIds?.some((id) => optimisticIds.has(id)),
  )
}

function filterLineItemsByMonth(items: ResumenLineItem[], month: Date): ResumenLineItem[] {
  return items.filter((item) => isFechaInMonth(item.fecha, month))
}

export function mergeResumenWithOptimistic(
  resumenMensual: ResumenMensual[],
  optimisticGastos: OptimisticGasto[],
  month: Date,
  pendingGastos: PendingGasto[] = [],
): { monto: number; categoria: string }[] {
  const base = resumenMensual.map((item) => ({
    monto: item.total,
    categoria: item.categoria,
  }))

  const optimistic = filterLineItemsByMonth(
    optimisticGastos.map((gasto) => ({
      monto: gasto.monto,
      categoria: gasto.categoria,
      fecha: gasto.fecha,
    })),
    month,
  ).map(({ monto, categoria }) => ({ monto, categoria }))

  const pending = filterLineItemsByMonth(
    filterPendingNotInOptimistic(pendingGastos, optimisticGastos).flatMap(
      expandPendingToLineItems,
    ),
    month,
  ).map(({ monto, categoria }) => ({ monto, categoria }))

  return [...base, ...optimistic, ...pending]
}

export function filterOptimisticGastos(
  optimisticGastos: OptimisticGasto[],
  month: Date,
  categoria: string,
  busqueda: string,
): OptimisticGasto[] {
  const termino = busqueda.trim().toLowerCase()

  return optimisticGastos.filter((gasto) => {
    if (!isFechaInMonth(gasto.fecha, month)) return false
    if (categoria !== 'Todas' && gasto.categoria !== categoria) return false
    if (termino && !gasto.descripcion.toLowerCase().includes(termino)) return false
    return true
  })
}
