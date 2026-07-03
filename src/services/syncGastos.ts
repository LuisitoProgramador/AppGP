import { notifyTelegram } from './notifyTelegram'
import { getPendingGastos, removePendingGasto, updatePendingGasto } from './offlineQueue'
import { shouldDiscardAfterRetry } from './syncPolicy'
import { supabase } from './supabase'
import type { GastoInsertFields } from '../types/gasto'

export interface SyncFailure {
  id: string
  descripcion: string
  error: string
}

export interface SyncResult {
  synced: number
  failures: SyncFailure[]
  discarded: number
  optimisticTempIdsRemoved: string[]
}

function rowsToInsert(gasto: {
  monto: number
  categoria: string
  descripcion: string
  fecha: string
  cuenta_id?: string | null
  es_msi?: boolean
  grupo_msi_id?: string | null
  msiInstallments?: GastoInsertFields[]
}): GastoInsertFields[] {
  if (gasto.msiInstallments && gasto.msiInstallments.length > 0) {
    return gasto.msiInstallments
  }

  return [
    {
      monto: gasto.monto,
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
      fecha: gasto.fecha,
      cuenta_id: gasto.cuenta_id ?? null,
      es_msi: gasto.es_msi ?? false,
      grupo_msi_id: gasto.grupo_msi_id ?? null,
    },
  ]
}

export async function syncPendingGastos(): Promise<SyncResult> {
  const pending = await getPendingGastos()
  const result: SyncResult = {
    synced: 0,
    failures: [],
    discarded: 0,
    optimisticTempIdsRemoved: [],
  }

  for (const gasto of pending) {
    const rows = rowsToInsert(gasto)
    const { error } = await supabase.from('gastos').insert(rows)

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
    result.synced += rows.length
    if (gasto.optimisticTempIds?.length) {
      result.optimisticTempIdsRemoved.push(...gasto.optimisticTempIds)
    }

    const notifyRow = rows[0]
    await notifyTelegram({
      monto: gasto.msiInstallments ? gasto.monto : notifyRow.monto,
      categoria: notifyRow.categoria,
      descripcion: gasto.msiInstallments
        ? `${gasto.descripcion} (MSI x${rows.length})`
        : notifyRow.descripcion,
    })
  }

  return result
}
