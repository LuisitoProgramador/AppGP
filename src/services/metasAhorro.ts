import type { MetaAhorro, MetaAhorroInput, PendingMetaAhorroUpdate } from '../types/metaAhorro'
import { isOnline, offlineServiceError } from '../utils/network'
import { supabase } from './supabase'

const META_SELECT = 'id, nombre, monto_objetivo, monto_actual, fecha_limite' as const

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
  localStorage.setItem(cacheKey(userId), JSON.stringify(metas))
}

function readPending(userId: string): PendingMetaAhorroUpdate[] {
  try {
    const raw = localStorage.getItem(pendingKey(userId))
    if (!raw) return []
    return JSON.parse(raw) as PendingMetaAhorroUpdate[]
  } catch {
    return []
  }
}

function writePending(userId: string, pending: PendingMetaAhorroUpdate[]) {
  localStorage.setItem(pendingKey(userId), JSON.stringify(pending))
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
  currentActual: number,
): Promise<{ data: MetaAhorro | null; error: string | null; offline: boolean }> {
  const nextActual = currentActual + amount
  const cached = readCache(userId)
  const optimistic = cached.map((meta) =>
    meta.id === metaId ? { ...meta, monto_actual: nextActual } : meta,
  )
  writeCache(userId, optimistic)

  if (!isOnline()) {
    const pending = readPending(userId)
    writePending(userId, [
      ...pending,
      { id: crypto.randomUUID(), metaId, amount, createdAt: Date.now() },
    ])
    const updated = optimistic.find((meta) => meta.id === metaId) ?? null
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

  const meta = mapMeta(data)
  writeCache(
    userId,
    cached.map((item) => (item.id === metaId ? meta : item)),
  )
  return { data: meta, error: null, offline: false }
}

export async function syncPendingMetaAhorro(userId: string): Promise<number> {
  if (!isOnline()) return 0

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
      remaining.push(item)
      continue
    }

    const nextActual = Number(meta.monto_actual) + item.amount
    const { error: updateError } = await supabase
      .from('metas_ahorro')
      .update({ monto_actual: nextActual })
      .eq('id', item.metaId)
      .eq('user_id', userId)

    if (updateError) {
      remaining.push(item)
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
