import {
  getCachedCuentas,
  persistCuentaSaldo,
  revertGastoSaldoLocal,
} from './cuentas'
import { getPendingGastos, removePendingGasto, updatePendingGasto } from './offlineQueue'
import { shouldDiscardAfterRetry } from './syncPolicy'
import { supabase } from './supabase'
import type { GastoInsertFields } from '../types/gasto'
import type { PendingGasto } from '../types/gasto'
import { montoSaldoAlEliminarPendiente } from '../utils/gastoSaldo'
import { mapWithConcurrency } from '../utils/concurrency'

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

const SYNC_GASTOS_CONCURRENCY = 3

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

type GastoInsertOutcome =
  | { kind: 'synced'; gasto: PendingGasto; rowCount: number }
  | { kind: 'validation'; gasto: PendingGasto; error: string }
  | { kind: 'insert_error'; gasto: PendingGasto; error: string }

async function tryInsertPendingGasto(gasto: PendingGasto): Promise<GastoInsertOutcome> {
  const rows = rowsToInsert(gasto)
  const msiError = validateMsiGroup(rows)
  if (msiError) {
    return { kind: 'validation', gasto, error: msiError }
  }

  const { error } = await supabase.from('gastos').insert(rows)
  if (error) {
    return { kind: 'insert_error', gasto, error: error.message }
  }

  return { kind: 'synced', gasto, rowCount: rows.length }
}

export async function syncPendingGastos(): Promise<SyncResult> {
  const pending = await getPendingGastos()
  const result: SyncResult = {
    synced: 0,
    failures: [],
    discarded: 0,
    optimisticTempIdsRemoved: [],
  }

  if (pending.length === 0) return result

  const {
    data: { user },
  } = await supabase.auth.getUser()
  let cachedCuentas = user ? getCachedCuentas(user.id) : []

  const outcomes = await mapWithConcurrency(
    pending,
    SYNC_GASTOS_CONCURRENCY,
    tryInsertPendingGasto,
  )

  for (const outcome of outcomes) {
    const gasto = outcome.gasto

    if (outcome.kind === 'validation' || outcome.kind === 'insert_error') {
      const retryCount = (gasto.retryCount ?? 0) + 1

      if (shouldDiscardAfterRetry(retryCount)) {
        if (user && gasto.cuenta_id && outcome.kind === 'insert_error') {
          const montoRevert = montoSaldoAlEliminarPendiente(gasto)
          cachedCuentas = revertGastoSaldoLocal(
            user.id,
            cachedCuentas,
            gasto.cuenta_id,
            montoRevert,
          )
          const cuenta = cachedCuentas.find((c) => c.id === gasto.cuenta_id)
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
          error: outcome.error,
        })
      } else {
        await updatePendingGasto({ ...gasto, retryCount })
        result.failures.push({
          id: gasto.id,
          descripcion: gasto.descripcion,
          error: outcome.error,
        })
      }

      continue
    }

    if (user && gasto.cuenta_id) {
      const cuenta = cachedCuentas.find((c) => c.id === gasto.cuenta_id)
      if (cuenta) {
        await persistCuentaSaldo(user.id, gasto.cuenta_id, cuenta.saldo_actual)
      }
    }

    await removePendingGasto(gasto.id)
    result.synced += outcome.rowCount
    if (gasto.optimisticTempIds?.length) {
      result.optimisticTempIdsRemoved.push(...gasto.optimisticTempIds)
    }
  }

  return result
}
