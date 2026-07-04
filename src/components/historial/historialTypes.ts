import type { Gasto, OptimisticGasto, PendingGasto } from '../../types/gasto'
import type { PendingIngreso } from '../../types/ingreso'

export interface IngresoHistorialItem {
  tipo: 'ingreso'
  id: number
  monto: number
  descripcion: string
  fecha: string
  cuenta_id: string
  categoria: 'Ingreso'
  pendiente?: false
}

export interface PendingIngresoHistorialItem extends PendingIngreso {
  tipo: 'ingreso'
  pendiente: true
  fecha: string
  categoria: 'Ingreso'
}

export type HistorialItem =
  | (Gasto & { pendiente?: false; optimistic?: false })
  | (PendingGasto & { pendiente: true })
  | (OptimisticGasto & { optimistic: true })
  | IngresoHistorialItem
  | PendingIngresoHistorialItem

export function isHistorialIngreso(
  item: HistorialItem,
): item is IngresoHistorialItem | PendingIngresoHistorialItem {
  return 'tipo' in item && item.tipo === 'ingreso'
}

export function isHistorialPendingIngreso(item: HistorialItem): item is PendingIngresoHistorialItem {
  return isHistorialIngreso(item) && item.pendiente === true
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
  return (
    !isHistorialOptimistic(item) &&
    !isHistorialPending(item) &&
    !isHistorialIngreso(item)
  )
}

export function getHistorialItemKey(item: HistorialItem): string {
  if (isHistorialPendingIngreso(item)) return `pending-ingreso-${item.id}`
  if (isHistorialIngreso(item)) return `ingreso-${item.id}`
  if (isHistorialOptimistic(item)) return `optimistic-${item.tempId}`
  if (isHistorialPending(item)) return `pending-${item.id}`
  return `gasto-${item.id}`
}

export function getHistorialAccionId(item: HistorialItem): string | number | null {
  if (isHistorialOptimistic(item)) return null
  if (isHistorialPendingIngreso(item)) return item.id
  if (isHistorialIngreso(item)) return null
  return item.id
}
