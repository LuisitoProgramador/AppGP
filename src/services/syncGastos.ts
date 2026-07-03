import { notifyTelegram } from './notifyTelegram'
import { getPendingGastos, removePendingGasto, updatePendingGasto } from './offlineQueue'
import { shouldDiscardAfterRetry } from './syncPolicy'
import { supabase } from './supabase'

export interface SyncFailure {
  id: string
  descripcion: string
  error: string
}

export interface SyncResult {
  synced: number
  failures: SyncFailure[]
  discarded: number
}

export async function syncPendingGastos(): Promise<SyncResult> {
  const pending = await getPendingGastos()
  const result: SyncResult = { synced: 0, failures: [], discarded: 0 }

  for (const gasto of pending) {
    const { error } = await supabase.from('gastos').insert({
      monto: gasto.monto,
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
      fecha: gasto.fecha,
    })

    if (error) {
      const retryCount = (gasto.retryCount ?? 0) + 1

      if (shouldDiscardAfterRetry(retryCount)) {
        await removePendingGasto(gasto.id)
        result.discarded += 1
        result.failures.push({
          id: gasto.id,
          descripcion: gasto.descripcion,
          error: error.message,
        })
      } else {
        await updatePendingGasto({ ...gasto, retryCount })
      }

      continue
    }

    await removePendingGasto(gasto.id)
    result.synced += 1

    await notifyTelegram({
      monto: gasto.monto,
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
    })
  }

  return result
}
