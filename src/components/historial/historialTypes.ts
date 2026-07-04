import type { Gasto, OptimisticGasto, PendingGasto } from '../../types/gasto'

export interface IngresoHistorialItem {
  tipo: 'ingreso'
  id: number
  monto: number
  descripcion: string
  fecha: string
  cuenta_id: string
  categoria: 'Ingreso'
}

export type HistorialItem =
  | (Gasto & { pendiente?: false; optimistic?: false })
  | (PendingGasto & { pendiente: true })
  | (OptimisticGasto & { optimistic: true })
  | IngresoHistorialItem

export function isHistorialIngreso(item: HistorialItem): item is IngresoHistorialItem {
  return 'tipo' in item && item.tipo === 'ingreso'
}

export function isHistorialOptimistic(
  item: HistorialItem,
): item is OptimisticGasto & { optimistic: true } {
  return 'optimistic' in item && item.optimistic === true
}

export function isHistorialPending(
  item: HistorialItem,
): item is PendingGasto & { pendiente: true } {
  return 'pendiente' in item && item.pendiente === true
}

export function isHistorialSynced(item: HistorialItem): item is Gasto {
  return !isHistorialOptimistic(item) && !isHistorialPending(item) && !isHistorialIngreso(item)
}

export function getHistorialItemKey(item: HistorialItem): string {
  if (isHistorialIngreso(item)) return `ingreso-${item.id}`
  if (isHistorialOptimistic(item)) return `optimistic-${item.tempId}`
  if (isHistorialPending(item)) return `pending-${item.id}`
  return `gasto-${item.id}`
}

export function getHistorialAccionId(item: HistorialItem): string | number | null {
  if (isHistorialOptimistic(item)) return null
  if (isHistorialIngreso(item)) return null
  return item.id
}
