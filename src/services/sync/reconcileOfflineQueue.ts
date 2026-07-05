import { isOnline } from '../../utils/core/network'
import { getPendingGastos, getPendingIngresos, removePendingGasto, removePendingIngreso } from './offlineQueue'
import { isPendingGastoSyncedOnServer } from './syncGastos'
import { isPendingIngresoSyncedOnServer } from './syncIngresos'

export interface ReconcileOfflineQueueResult {
  gastosRemoved: number
  ingresosRemoved: number
}

/** Elimina de IndexedDB pendientes que ya existen en Supabase (p. ej. remove falló al finalizar sync). */
export async function reconcileOfflineQueue(userId: string): Promise<ReconcileOfflineQueueResult> {
  if (!isOnline()) {
    return { gastosRemoved: 0, ingresosRemoved: 0 }
  }

  const [pendingGastos, pendingIngresos] = await Promise.all([
    getPendingGastos(userId),
    getPendingIngresos(userId),
  ])

  let gastosRemoved = 0
  let ingresosRemoved = 0

  for (const gasto of pendingGastos) {
    if (await isPendingGastoSyncedOnServer(gasto, userId)) {
      await removePendingGasto(gasto.id)
      gastosRemoved += 1
    }
  }

  for (const ingreso of pendingIngresos) {
    if (await isPendingIngresoSyncedOnServer(ingreso, userId)) {
      await removePendingIngreso(ingreso.id)
      ingresosRemoved += 1
    }
  }

  return { gastosRemoved, ingresosRemoved }
}
