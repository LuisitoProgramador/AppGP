import type { MetaAhorro, MetaAhorroInput, PendingMetaAhorroUpdate } from '../types/metaAhorro'
import { isOnline, offlineServiceError } from '../utils/network'
import { shouldDiscardAfterRetry } from './syncPolicy'
import { supabase } from './supabase'

const META_SELECT = 'id, nombre, monto_objetivo, monto_actual, fecha_limite' as const

let syncMetaPromise: Promise<number> | null = null
let syncMetaUserId: string | null = null

function cacheKey(userId: string) {
  return `metas_ahorro_${userId}`
}

function pendingKey(userId: string) {
  return `metas_ahorro_pending_${userId}`
}

function readCache(userId: string): MetaAhorro[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return []
    return JSON.parse(raw) as MetaAhorro[]
  } catch {
    return []
  }
}

function writeCache(userId: string, metas: MetaAhorro[]) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(metas))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
}

function normalizePending(item: PendingMetaAhorroUpdate): PendingMetaAhorroUpdate {
  return { ...item, retryCount: item.retryCount ?? 0 }
}

function readPending(userId: string): PendingMetaAhorroUpdate[] {
  try {
    const raw = localStorage.getItem(pendingKey(userId))
    if (!raw) return []
    return (JSON.parse(raw) as PendingMetaAhorroUpdate[]).map(normalizePending)
  } catch {
    return []
  }
}

function writePending(userId: string, pending: PendingMetaAhorroUpdate[]) {
  try {
    localStorage.setItem(pendingKey(userId), JSON.stringify(pending))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
}

function revertPendingMetaInCache(userId: string, item: PendingMetaAhorroUpdate): void {
  const cached = readCache(userId)
  writeCache(
    userId,
    cached.map((meta) =>
      meta.id === item.metaId
        ? {
            ...meta,
            monto_actual: Math.max(0, Math.round((meta.monto_actual - item.amount) * 100) / 100),
          }
        : meta,
    ),
  )
}

function mapMeta(row: Record<string, unknown>): MetaAhorro {
  return {
    id: Number(row.id),
    nombre: String(row.nombre),
    monto_objetivo: Number(row.monto_objetivo),
    monto_actual: Number(row.monto_actual),
    fecha_limite: row.fecha_limite ? String(row.fecha_limite) : null,
  }
}

export async function listMetasAhorro(
  userId: string,
): Promise<{ data: MetaAhorro[]; error: string | null; fromCache: boolean }> {
  if (!isOnline()) {
    return { data: readCache(userId), error: null, fromCache: true }
  }

  const { data, error } = await supabase
    .from('metas_ahorro')
    .select(META_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    const cached = readCache(userId)
    if (cached.length > 0) {
      return { data: cached, error: null, fromCache: true }
    }
    return { data: [], error: error.message, fromCache: false }
  }

  const metas = (data ?? []).map((row) => mapMeta(row))
  writeCache(userId, metas)
  return { data: metas, error: null, fromCache: false }
}

export async function createMetaAhorro(
  userId: string,
  input: MetaAhorroInput,
): Promise<{ data: MetaAhorro | null; error: string | null }> {
  if (!isOnline()) {
    return offlineServiceError('Sin conexión. Conéctate para crear una meta de ahorro.')
  }

  const { data, error } = await supabase
    .from('metas_ahorro')
    .insert({
      nombre: input.nombre,
      monto_objetivo: input.monto_objetivo,
      fecha_limite: input.fecha_limite ?? null,
    })
    .select(META_SELECT)
    .single()

  if (error) return { data: null, error: error.message }

  const meta = mapMeta(data)
  writeCache(userId, [...readCache(userId), meta])
  return { data: meta, error: null }
}

export async function addAhorroToMeta(
  userId: string,
  metaId: number,
  amount: number,
): Promise<{ data: MetaAhorro | null; error: string | null; offline: boolean }> {
  const cached = readCache(userId)
  const meta = cached.find((item) => item.id === metaId)
  if (!meta) {
    return { data: null, error: 'Meta de ahorro no encontrada.', offline: false }
  }

  const nextActual = Math.round((meta.monto_actual + amount) * 100) / 100
  const optimistic = cached.map((item) =>
    item.id === metaId ? { ...item, monto_actual: nextActual } : item,
  )
  writeCache(userId, optimistic)

  if (!isOnline()) {
    const pending = readPending(userId)
    writePending(userId, [
      ...pending,
      { id: crypto.randomUUID(), metaId, amount, createdAt: Date.now(), retryCount: 0 },
    ])
    const updated = optimistic.find((item) => item.id === metaId) ?? null
    return { data: updated, error: null, offline: true }
  }

  const { data, error } = await supabase
    .from('metas_ahorro')
    .update({ monto_actual: nextActual })
    .eq('id', metaId)
    .eq('user_id', userId)
    .select(META_SELECT)
    .single()

  if (error) {
    writeCache(userId, cached)
    return { data: null, error: error.message, offline: false }
  }

  const updatedMeta = mapMeta(data)
  writeCache(
    userId,
    cached.map((item) => (item.id === metaId ? updatedMeta : item)),
  )
  return { data: updatedMeta, error: null, offline: false }
}

async function syncPendingMetaAhorroInner(userId: string): Promise<number> {
  const pending = readPending(userId)
  if (pending.length === 0) return 0

  const remaining: PendingMetaAhorroUpdate[] = []
  let synced = 0

  for (const item of pending) {
    const { data: meta, error: fetchError } = await supabase
      .from('metas_ahorro')
      .select(META_SELECT)
      .eq('id', item.metaId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError || !meta) {
      const retryCount = (item.retryCount ?? 0) + 1
      if (shouldDiscardAfterRetry(retryCount)) {
        revertPendingMetaInCache(userId, item)
      } else {
        remaining.push({ ...item, retryCount })
      }
      continue
    }

    const nextActual = Math.round((Number(meta.monto_actual) + item.amount) * 100) / 100
    const { error: updateError } = await supabase
      .from('metas_ahorro')
      .update({ monto_actual: nextActual })
      .eq('id', item.metaId)
      .eq('user_id', userId)

    if (updateError) {
      const retryCount = (item.retryCount ?? 0) + 1
      if (shouldDiscardAfterRetry(retryCount)) {
        revertPendingMetaInCache(userId, item)
      } else {
        remaining.push({ ...item, retryCount })
      }
      continue
    }

    synced += 1
  }

  writePending(userId, remaining)

  if (synced > 0) {
    await listMetasAhorro(userId)
  }

  return synced
}

export async function syncPendingMetaAhorro(userId: string): Promise<number> {
  if (!isOnline()) return 0

  if (syncMetaPromise && syncMetaUserId === userId) {
    return syncMetaPromise
  }

  syncMetaUserId = userId
  syncMetaPromise = syncPendingMetaAhorroInner(userId).finally(() => {
    syncMetaPromise = null
    syncMetaUserId = null
  })

  return syncMetaPromise
}
