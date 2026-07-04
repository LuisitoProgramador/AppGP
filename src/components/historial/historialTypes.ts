import type { Gasto, OptimisticGasto, PendingGasto } from '../../types/gasto'

export type HistorialItem =
  | (Gasto & { pendiente?: false; optimistic?: false })
  | (PendingGasto & { pendiente: true })
  | (OptimisticGasto & { optimistic: true })

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
  return !isHistorialOptimistic(item) && !isHistorialPending(item)
}

export function getHistorialItemKey(item: HistorialItem): string {
  if (isHistorialOptimistic(item)) return `optimistic-${item.tempId}`
  if (isHistorialPending(item)) return `pending-${item.id}`
  return `gasto-${item.id}`
}

export function getHistorialAccionId(item: HistorialItem): string | number | null {
  if (isHistorialOptimistic(item)) return null
  return item.id
}
