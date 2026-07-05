import type { MetaAhorro, PendingMetaAhorroUpdate } from '../../types/metaAhorro'
import { roundMoney, sumMoney } from '../../utils/core/centavos'

function cacheKey(userId: string) {
  return `metas_ahorro_${userId}`
}

function pendingKey(userId: string) {
  return `metas_ahorro_pending_${userId}`
}

export function readCache(userId: string): MetaAhorro[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return []
    return JSON.parse(raw) as MetaAhorro[]
  } catch {
    return []
  }
}

export function writeCache(userId: string, metas: MetaAhorro[]) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(metas))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
}

function normalizePending(item: PendingMetaAhorroUpdate): PendingMetaAhorroUpdate {
  return { ...item, retryCount: item.retryCount ?? 0 }
}

export function readPending(userId: string): PendingMetaAhorroUpdate[] {
  try {
    const raw = localStorage.getItem(pendingKey(userId))
    if (!raw) return []
    return (JSON.parse(raw) as PendingMetaAhorroUpdate[]).map(normalizePending)
  } catch {
    return []
  }
}

export function writePending(userId: string, pending: PendingMetaAhorroUpdate[]) {
  try {
    localStorage.setItem(pendingKey(userId), JSON.stringify(pending))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
}

export function revertPendingMetaInCache(userId: string, item: PendingMetaAhorroUpdate): void {
  const cached = readCache(userId)
  writeCache(
    userId,
    cached.map((meta) =>
      meta.id === item.metaId
        ? {
            ...meta,
            monto_actual: Math.max(0, roundMoney(sumMoney(meta.monto_actual, -item.amount))),
          }
        : meta,
    ),
  )
}
