import type { MetaAhorro, MetaAhorroInput } from '../../types/metaAhorro'
import { isOnline, offlineServiceError } from '../../utils/core/network'
import { roundMoney, sumMoney } from '../../utils/core/centavos'
import { supabase } from '../supabase'
import { readCache, readPending, writeCache, writePending } from './cache'

export const META_SELECT = 'id, nombre, monto_objetivo, monto_actual, fecha_limite, created_at' as const

export function mapMeta(row: Record<string, unknown>): MetaAhorro {
  return {
    id: Number(row.id),
    nombre: String(row.nombre),
    monto_objetivo: Number(row.monto_objetivo),
    monto_actual: Number(row.monto_actual),
    fecha_limite: row.fecha_limite ? String(row.fecha_limite) : null,
    created_at: row.created_at ? String(row.created_at) : null,
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

export async function updateMetaAhorro(
  userId: string,
  metaId: number,
  input: Partial<Pick<MetaAhorroInput, 'nombre' | 'monto_objetivo' | 'fecha_limite'>>,
): Promise<{ data: MetaAhorro | null; error: string | null }> {
  if (!isOnline()) {
    return offlineServiceError('Sin conexión. Conéctate para editar la meta.')
  }

  const row: Record<string, unknown> = {}
  if (input.nombre !== undefined) row.nombre = input.nombre.trim()
  if (input.monto_objetivo !== undefined) row.monto_objetivo = input.monto_objetivo
  if (input.fecha_limite !== undefined) row.fecha_limite = input.fecha_limite

  const { data, error } = await supabase
    .from('metas_ahorro')
    .update(row)
    .eq('id', metaId)
    .eq('user_id', userId)
    .select(META_SELECT)
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'No se pudo actualizar.' }

  const meta = mapMeta(data)
  writeCache(
    userId,
    readCache(userId).map((item) => (item.id === metaId ? meta : item)),
  )
  return { data: meta, error: null }
}

export async function deleteMetaAhorro(
  userId: string,
  metaId: number,
): Promise<{ error: string | null }> {
  if (!isOnline()) {
    return offlineServiceError('Sin conexión. Conéctate para eliminar la meta.')
  }

  const { error } = await supabase
    .from('metas_ahorro')
    .delete()
    .eq('id', metaId)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  writeCache(userId, readCache(userId).filter((item) => item.id !== metaId))
  return { error: null }
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

  const nextActual = roundMoney(sumMoney(meta.monto_actual, amount))
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
