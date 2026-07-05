import {
  getCachedCuentas,
  persistCuentaSaldo,
  revertGastoSaldoLocal,
} from '../cuentas'
import { getPendingGastos, removePendingGasto, updatePendingGasto } from './offlineQueue'
import { shouldDiscardAfterRetry } from './syncPolicy'
import { supabase } from '../supabase'
import type { GastoInsertFields, PendingGasto } from '../../types/gasto'
import { montoSaldoAlEliminarPendiente } from '../../utils/gastos/gastoSaldo'
import { mapWithConcurrency } from '../../utils/core/concurrency'

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

function rowsToInsert(gasto: PendingGasto): GastoInsertFields[] {
  const base: GastoInsertFields[] =
    gasto.msiInstallments && gasto.msiInstallments.length > 0
      ? gasto.msiInstallments
      : [
          {
            monto: gasto.monto,
            categoria: gasto.categoria,
            descripcion: gasto.descripcion,
            fecha: gasto.fecha,
            cuenta_id: gasto.cuenta_id ?? null,
            es_msi: gasto.es_msi ?? false,
            grupo_msi_id: gasto.grupo_msi_id ?? null,
            total_compra_msi: gasto.total_compra_msi ?? null,
          },
        ]

  if (base.length === 1) {
    return [{ ...base[0], offline_id: gasto.id }]
  }

  return base.map((row, index) =>
    index === 0 ? { ...row, offline_id: gasto.id } : row,
  )
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
  | { kind: 'persist_error'; gasto: PendingGasto; error: string }

async function legacyAlreadySynced(gasto: PendingGasto, userId: string): Promise<boolean> {
  const rows = rowsToInsert(gasto)

  if (gasto.grupo_msi_id && rows.length > 1) {
    const { count, error } = await supabase
      .from('gastos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('grupo_msi_id', gasto.grupo_msi_id)

    if (error) return false
    return (count ?? 0) >= rows.length
  }

  const row = rows[0]
  const { count, error } = await supabase
    .from('gastos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('monto', row.monto)
    .eq('categoria', row.categoria)
    .eq('descripcion', row.descripcion)
    .eq('fecha', row.fecha)
    .eq('cuenta_id', row.cuenta_id ?? null)

  if (error) return false
  return (count ?? 0) > 0
}

async function alreadySyncedOnServer(gasto: PendingGasto, userId: string): Promise<boolean> {
  const expectedRows = rowsToInsert(gasto).length

  const { count, error } = await supabase
    .from('gastos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('offline_id', gasto.id)

  if (error) {
    return legacyAlreadySynced(gasto, userId)
  }

  if ((count ?? 0) === 0) {
    return legacyAlreadySynced(gasto, userId)
  }

  if (expectedRows <= 1) return true

  if (gasto.grupo_msi_id) {
    const { count: grupoCount, error: grupoError } = await supabase
      .from('gastos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('grupo_msi_id', gasto.grupo_msi_id)

    if (grupoError) return true
    return (grupoCount ?? 0) >= expectedRows
  }

  return true
}

export async function isPendingGastoSyncedOnServer(
  gasto: PendingGasto,
  userId: string,
): Promise<boolean> {
  return alreadySyncedOnServer(gasto, userId)
}

async function revertPendingSaldo(
  userId: string,
  gasto: PendingGasto,
  cachedCuentas: ReturnType<typeof getCachedCuentas>,
): Promise<ReturnType<typeof getCachedCuentas>> {
  if (!gasto.cuenta_id) return cachedCuentas

  const montoRevert = montoSaldoAlEliminarPendiente(gasto)
  const updated = revertGastoSaldoLocal(userId, cachedCuentas, gasto.cuenta_id, montoRevert)
  const cuenta = updated.find((c) => c.id === gasto.cuenta_id)
  if (cuenta) {
    await persistCuentaSaldo(userId, gasto.cuenta_id, cuenta.saldo_actual)
  }
  return updated
}

async function tryInsertPendingGasto(
  gasto: PendingGasto,
  userId: string,
): Promise<GastoInsertOutcome> {
  if (await alreadySyncedOnServer(gasto, userId)) {
    return { kind: 'synced', gasto, rowCount: rowsToInsert(gasto).length }
  }

  const rows = rowsToInsert(gasto)
  const msiError = validateMsiGroup(rows)
  if (msiError) {
    return { kind: 'validation', gasto, error: msiError }
  }

  const { error } = await supabase.from('gastos').insert(rows)
  if (error) {
    if (await alreadySyncedOnServer(gasto, userId)) {
      return { kind: 'synced', gasto, rowCount: rows.length }
    }
    return { kind: 'insert_error', gasto, error: error.message }
  }

  return { kind: 'synced', gasto, rowCount: rows.length }
}

export async function syncPendingGastos(userId: string): Promise<SyncResult> {
  const pending = await getPendingGastos(userId)
  const result: SyncResult = {
    synced: 0,
    failures: [],
    discarded: 0,
    optimisticTempIdsRemoved: [],
  }

  if (pending.length === 0) return result

  let cachedCuentas = getCachedCuentas(userId)

  const outcomes = await mapWithConcurrency(
    pending,
    SYNC_GASTOS_CONCURRENCY,
    (gasto) => tryInsertPendingGasto(gasto, userId),
  )

  for (const outcome of outcomes) {
    const gasto = outcome.gasto

    if (
      outcome.kind === 'validation' ||
      outcome.kind === 'insert_error' ||
      outcome.kind === 'persist_error'
    ) {
      const retryCount = (gasto.retryCount ?? 0) + 1

      if (shouldDiscardAfterRetry(retryCount, outcome.error)) {
        if (gasto.cuenta_id) {
          cachedCuentas = await revertPendingSaldo(userId, gasto, cachedCuentas)
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

    if (gasto.cuenta_id) {
      const cuenta = cachedCuentas.find((c) => c.id === gasto.cuenta_id)
      if (cuenta) {
        const { error: persistError } = await persistCuentaSaldo(
          userId,
          gasto.cuenta_id,
          cuenta.saldo_actual,
        )
        if (persistError) {
          const retryCount = (gasto.retryCount ?? 0) + 1
          if (shouldDiscardAfterRetry(retryCount, persistError)) {
            cachedCuentas = await revertPendingSaldo(userId, gasto, cachedCuentas)
            if (gasto.optimisticTempIds?.length) {
              result.optimisticTempIdsRemoved.push(...gasto.optimisticTempIds)
            }
            await removePendingGasto(gasto.id)
            result.discarded += 1
            result.failures.push({
              id: gasto.id,
              descripcion: gasto.descripcion,
              error: persistError,
            })
          } else {
            await updatePendingGasto({ ...gasto, retryCount })
            result.failures.push({
              id: gasto.id,
              descripcion: gasto.descripcion,
              error: persistError,
            })
          }
          continue
        }
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
