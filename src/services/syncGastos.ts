import {
  getCachedCuentas,
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

function validateMsiGroup(rows: GastoInsertFields[]): string | null {
  if (rows.length <= 1) return null

  const grupoId = rows[0]?.grupo_msi_id
  if (!grupoId) {
    return 'Grupo MSI incompleto: falta grupo_msi_id.'
  }

  const invalid = rows.some((row) => !row.es_msi || row.grupo_msi_id !== grupoId)
  if (invalid) {
    return 'Grupo MSI inconsistente: las cuotas no comparten el mismo grupo.'
  }

  return null
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
    const msiError = validateMsiGroup(rows)

    if (msiError) {
      const retryCount = (gasto.retryCount ?? 0) + 1
      if (shouldDiscardAfterRetry(retryCount)) {
        await removePendingGasto(gasto.id)
        result.discarded += 1
        result.failures.push({
          id: gasto.id,
          descripcion: gasto.descripcion,
          error: msiError,
        })
      } else {
        await updatePendingGasto({ ...gasto, retryCount })
        result.failures.push({
          id: gasto.id,
          descripcion: gasto.descripcion,
          error: msiError,
        })
      }
      continue
    }

    const { error } = await supabase.from('gastos').insert(rows)

    if (error) {
      const retryCount = (gasto.retryCount ?? 0) + 1

      if (shouldDiscardAfterRetry(retryCount)) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user && gasto.cuenta_id) {
          const cuentas = getCachedCuentas(user.id)
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
        result.failures.push({
          id: gasto.id,
          descripcion: gasto.descripcion,
          error: error.message,
        })
      }

      continue
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && gasto.cuenta_id) {
      const cuenta = getCachedCuentas(user.id).find((c) => c.id === gasto.cuenta_id)
      if (cuenta) {
        await persistCuentaSaldo(user.id, gasto.cuenta_id, cuenta.saldo_actual)
      }
    }

    await removePendingGasto(gasto.id)
    result.synced += rows.length
    if (gasto.optimisticTempIds?.length) {
      result.optimisticTempIdsRemoved.push(...gasto.optimisticTempIds)
    }
  }

  return result
}
