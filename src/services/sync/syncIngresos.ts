import {
  getCachedCuentas,
  persistCuentaSaldo,
  revertIngresoSaldoLocal,
} from '../cuentas'
import {
  getPendingIngresos,
  removePendingIngreso,
  updatePendingIngreso,
} from './offlineQueue'
import { shouldDiscardAfterRetry } from './syncPolicy'
import { supabase } from '../supabase'
import type { PendingIngreso } from '../../types/ingreso'
import { mapWithConcurrency } from '../../utils/core/concurrency'

export interface SyncIngresosResult {
  synced: number
  failures: { id: string; descripcion: string; error: string }[]
  discarded: number
}

const SYNC_INGRESOS_CONCURRENCY = 2

async function alreadySyncedOnServer(ingreso: PendingIngreso, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('ingresos_cuenta')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('offline_id', ingreso.id)

  if (error) return false
  return (count ?? 0) > 0
}

export async function isPendingIngresoSyncedOnServer(
  ingreso: PendingIngreso,
  userId: string,
): Promise<boolean> {
  return alreadySyncedOnServer(ingreso, userId)
}

async function tryInsertPendingIngreso(
  ingreso: PendingIngreso,
  userId: string,
): Promise<
  | { kind: 'synced'; ingreso: PendingIngreso }
  | { kind: 'insert_error'; ingreso: PendingIngreso; error: string }
  | { kind: 'persist_error'; ingreso: PendingIngreso; error: string }
> {
  if (await alreadySyncedOnServer(ingreso, userId)) {
    return { kind: 'synced', ingreso }
  }

  const { error } = await supabase.from('ingresos_cuenta').insert({
    cuenta_id: ingreso.cuenta_id,
    monto: ingreso.monto,
    descripcion: ingreso.descripcion,
    offline_id: ingreso.id,
  })

  if (error) {
    if (await alreadySyncedOnServer(ingreso, userId)) {
      return { kind: 'synced', ingreso }
    }
    return { kind: 'insert_error', ingreso, error: error.message }
  }

  return { kind: 'synced', ingreso }
}

export async function syncPendingIngresos(userId: string): Promise<SyncIngresosResult> {
  const pending = await getPendingIngresos(userId)
  const result: SyncIngresosResult = { synced: 0, failures: [], discarded: 0 }

  if (pending.length === 0) return result

  let cachedCuentas = getCachedCuentas(userId)

  const outcomes = await mapWithConcurrency(
    pending,
    SYNC_INGRESOS_CONCURRENCY,
    (ingreso) => tryInsertPendingIngreso(ingreso, userId),
  )

  for (const outcome of outcomes) {
    const ingreso = outcome.ingreso

    if (outcome.kind === 'insert_error') {
      const retryCount = (ingreso.retryCount ?? 0) + 1
      if (shouldDiscardAfterRetry(retryCount, outcome.error)) {
        cachedCuentas = revertIngresoSaldoLocal(userId, cachedCuentas, ingreso.cuenta_id, ingreso.monto)
        await removePendingIngreso(ingreso.id)
        result.discarded += 1
        result.failures.push({
          id: ingreso.id,
          descripcion: ingreso.descripcion,
          error: outcome.error,
        })
      } else {
        await updatePendingIngreso({ ...ingreso, retryCount })
        result.failures.push({
          id: ingreso.id,
          descripcion: ingreso.descripcion,
          error: outcome.error,
        })
      }
      continue
    }

    const cuenta = cachedCuentas.find((c) => c.id === ingreso.cuenta_id)
    if (cuenta) {
      const { error: persistError } = await persistCuentaSaldo(
        userId,
        ingreso.cuenta_id,
        cuenta.saldo_actual,
      )
      if (persistError) {
        const retryCount = (ingreso.retryCount ?? 0) + 1
        if (shouldDiscardAfterRetry(retryCount, persistError)) {
          cachedCuentas = revertIngresoSaldoLocal(
            userId,
            cachedCuentas,
            ingreso.cuenta_id,
            ingreso.monto,
          )
          await removePendingIngreso(ingreso.id)
          result.discarded += 1
          result.failures.push({
            id: ingreso.id,
            descripcion: ingreso.descripcion,
            error: persistError,
          })
        } else {
          await updatePendingIngreso({ ...ingreso, retryCount })
          result.failures.push({
            id: ingreso.id,
            descripcion: ingreso.descripcion,
            error: persistError,
          })
        }
        continue
      }
    }

    await removePendingIngreso(ingreso.id)
    result.synced += 1
  }

  return result
}
