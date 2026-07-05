import type { MetaAhorro } from '../../types/metaAhorro'
import { calcMetaObjetivoAnual } from '../../utils/finanzas'
import {
  esMetaAhorroAnual,
  finDeAnoCalendarioIso,
  metaAnualDelAnio,
  metaAnualExpirada,
  nombreMetaAhorroAnual,
} from '../../utils/finanzas/metaCalendario'
import { isOnline } from '../../utils/core/network'
import { shouldDiscardAfterRetry } from '../sync/syncPolicy'
import { getPresupuesto } from '../presupuesto/fetch'
import { supabase } from '../supabase'
import { readCache, readPending, revertPendingMetaInCache, writeCache, writePending } from './cache'
import { createMetaAhorro, listMetasAhorro, mapMeta, META_SELECT } from './crud'

let syncMetaPromise: Promise<number> | null = null
let syncMetaUserId: string | null = null

async function syncPendingMetaAhorroInner(userId: string): Promise<number> {
  const pending = readPending(userId)
  if (pending.length === 0) return 0

  const remaining: typeof pending = []
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
      if (shouldDiscardAfterRetry(retryCount, fetchError?.message)) {
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
      if (shouldDiscardAfterRetry(retryCount, updateError.message)) {
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

export interface PresupuestoMetaSync {
  sueldo_mensual: number
  porcentaje_ahorro: number
  ingresos_extras?: number | null
}

async function syncMetaAnualConPresupuesto(
  userId: string,
  meta: MetaAhorro,
  sueldoMensual: number,
  porcentajeAhorro: number,
  ingresosExtras: number,
): Promise<MetaAhorro | null> {
  if (!esMetaAhorroAnual(meta)) return null

  const hoy = new Date()
  const year = hoy.getFullYear()
  if (metaAnualExpirada(meta, hoy) || !metaAnualDelAnio(meta, year)) return null

  const fechaInicio = meta.created_at ? new Date(meta.created_at) : hoy
  const objetivo = calcMetaObjetivoAnual(
    sueldoMensual,
    porcentajeAhorro,
    ingresosExtras,
    fechaInicio,
  )
  const nombre = nombreMetaAhorroAnual(year)
  const fecha_limite = finDeAnoCalendarioIso(new Date(year, 0, 1))

  const needsUpdate =
    meta.nombre !== nombre ||
    meta.fecha_limite !== fecha_limite ||
    Math.abs(meta.monto_objetivo - objetivo) > 0.01

  if (!needsUpdate) return null

  const { data, error } = await supabase
    .from('metas_ahorro')
    .update({ nombre, monto_objetivo: objetivo, fecha_limite })
    .eq('id', meta.id)
    .eq('user_id', userId)
    .select(META_SELECT)
    .single()

  if (error || !data) return null
  return mapMeta(data)
}

/** Recalcula la meta anual vigente cuando cambia sueldo, extras o % de ahorro. */
export async function syncMetasAnualesConPresupuesto(
  userId: string,
  presupuesto?: PresupuestoMetaSync | null,
): Promise<boolean> {
  if (!isOnline()) return false

  const config = presupuesto ?? (await getPresupuesto(userId))
  if (config?.sueldo_mensual == null || config.porcentaje_ahorro == null) {
    return false
  }

  const ingresosExtras = config.ingresos_extras ?? 0

  const { data: rows } = await supabase
    .from('metas_ahorro')
    .select(META_SELECT)
    .eq('user_id', userId)

  const metas = (rows ?? []).map((row) => mapMeta(row))
  if (metas.length === 0) return false

  let updated = false
  let nextCache = readCache(userId)

  for (const meta of metas) {
    const synced = await syncMetaAnualConPresupuesto(
      userId,
      meta,
      config.sueldo_mensual,
      config.porcentaje_ahorro,
      ingresosExtras,
    )
    if (!synced) continue

    updated = true
    const inCache = nextCache.some((item) => item.id === synced.id)
    nextCache = inCache
      ? nextCache.map((item) => (item.id === synced.id ? synced : item))
      : [...nextCache, synced]
  }

  if (updated) writeCache(userId, nextCache)
  return updated
}

export async function ensureMetaAhorroAnioCalendario(userId: string): Promise<void> {
  if (!isOnline()) return

  const presupuesto = await getPresupuesto(userId)
  if (presupuesto?.sueldo_mensual == null || presupuesto.porcentaje_ahorro == null) {
    return
  }

  const { data: rows } = await supabase
    .from('metas_ahorro')
    .select(META_SELECT)
    .eq('user_id', userId)

  const metas = (rows ?? []).map((row) => mapMeta(row))
  const hoy = new Date()
  const year = hoy.getFullYear()
  const ingresosExtras = presupuesto.ingresos_extras ?? 0

  await syncMetasAnualesConPresupuesto(userId, {
    sueldo_mensual: presupuesto.sueldo_mensual,
    porcentaje_ahorro: presupuesto.porcentaje_ahorro,
    ingresos_extras: presupuesto.ingresos_extras,
  })

  const { data: refreshedRows } = await supabase
    .from('metas_ahorro')
    .select(META_SELECT)
    .eq('user_id', userId)

  const refreshed = (refreshedRows ?? []).map((row) => mapMeta(row))
  const tieneMetaVigente = refreshed.some(
    (meta) => metaAnualDelAnio(meta, year) && !metaAnualExpirada(meta, hoy),
  )
  const tuvoMetaAnualExpirada = metas.some(
    (meta) => esMetaAhorroAnual(meta) && metaAnualExpirada(meta, hoy),
  )

  if (tieneMetaVigente || !tuvoMetaAnualExpirada) return

  const objetivo = calcMetaObjetivoAnual(
    presupuesto.sueldo_mensual,
    presupuesto.porcentaje_ahorro,
    ingresosExtras,
    hoy,
  )

  await createMetaAhorro(userId, {
    nombre: nombreMetaAhorroAnual(year),
    monto_objetivo: objetivo,
    fecha_limite: finDeAnoCalendarioIso(hoy),
  })
}
