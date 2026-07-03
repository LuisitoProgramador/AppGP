import { notifyTelegram } from './notifyTelegram'
import {
  listCuentas,
  persistCuentaSaldo,
  revertGastoSaldoLocal,
} from './cuentas'
import { getPendingGastos, removePendingGasto, updatePendingGasto } from './offlineQueue'
import { shouldDiscardAfterRetry } from './syncPolicy'
import { supabase } from './supabase'
import type { GastoInsertFields } from '../types/gasto'
import { montoSaldoAlEliminarPendiente } from '../utils/gastoSaldo'

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
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user && gasto.cuenta_id) {
          const { data: cuentas } = await listCuentas(user.id)
          const montoRevert = montoSaldoAlEliminarPendiente(gasto)
          const updated = revertGastoSaldoLocal(
            user.id,
            cuentas,
            gasto.cuenta_id,
            montoRevert,
          )
          const cuenta = updated.find((c) => c.id === gasto.cuenta_id)
          if (cuenta) {
            await persistCuentaSaldo(user.id, gasto.cuenta_id, cuenta.saldo_actual)
          }
        }

        if (gasto.optimisticTempIds?.length) {
          result.optimisticTempIdsRemoved.push(...gasto.optimisticTempIds)
        }

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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && gasto.cuenta_id) {
      const { data: cuentas } = await listCuentas(user.id)
      const cuenta = cuentas.find((c) => c.id === gasto.cuenta_id)
      if (cuenta) {
        await persistCuentaSaldo(user.id, gasto.cuenta_id, cuenta.saldo_actual)
      }
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
