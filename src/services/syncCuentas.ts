import type { Cuenta } from '../types/cuenta'
import {
  getCachedCuentas,
  insertCuentaRemoto,
  pendingCuentaToCuenta,
  setCachedCuentas,
} from './cuentas'
import {
  getPendingCuentas,
  removePendingCuenta,
  updatePendingCuenta,
} from './offlineQueue'
import { shouldDiscardAfterRetry } from './syncPolicy'

export interface SyncCuentaFailure {
  id: string
  nombre: string
  error: string
}

export interface SyncCuentasResult {
  synced: number
  failures: SyncCuentaFailure[]
  discarded: number
  idMap: Record<string, string>
}

function replaceTempCuentaInCache(
  userId: string,
  tempId: string,
  cuenta: Cuenta,
): void {
  const cached = getCachedCuentas(userId)
  const updated = cached.map((item) => (item.id === tempId ? cuenta : item))
  setCachedCuentas(userId, updated)
}

export async function syncPendingCuentas(userId: string): Promise<SyncCuentasResult> {
  const pending = (await getPendingCuentas()).filter((item) => item.userId === userId)
  const result: SyncCuentasResult = {
    synced: 0,
    failures: [],
    discarded: 0,
    idMap: {},
  }

  for (const item of pending) {
    const { data, error } = await insertCuentaRemoto(userId, {
      nombre: item.nombre,
      tipo: item.tipo,
      saldo_actual: item.saldo_actual,
      limite_credito: item.limite_credito,
      dia_corte: item.dia_corte,
      dia_pago: item.dia_pago,
    })

    if (error || !data) {
      const retryCount = (item.retryCount ?? 0) + 1

      if (shouldDiscardAfterRetry(retryCount)) {
        const cached = getCachedCuentas(userId).filter((c) => c.id !== item.tempCuentaId)
        setCachedCuentas(userId, cached)
        await removePendingCuenta(item.id)
        result.discarded += 1
        result.failures.push({
          id: item.id,
          nombre: item.nombre,
          error: error ?? 'No se pudo crear la cuenta en el servidor.',
        })
      } else {
        await updatePendingCuenta({ ...item, retryCount })
        result.failures.push({
          id: item.id,
          nombre: item.nombre,
          error: error ?? 'Error desconocido al sincronizar cuenta.',
        })
      }
      continue
    }

    result.idMap[item.tempCuentaId] = data.id
    replaceTempCuentaInCache(userId, item.tempCuentaId, data)
    await removePendingCuenta(item.id)
    result.synced += 1
  }

  return result
}
