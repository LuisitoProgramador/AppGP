import type { Cuenta, CuentaInput } from '../../types/cuenta'
import { isOnline, offlineServiceError } from '../../utils/core/network'
import { addPendingCuenta } from '../sync/offlineQueue'
import { supabase } from '../supabase'
import { appendToCache, readCache, writeCache } from './cache'
import { CUENTA_SELECT, CUENTA_SELECT_BASE, mapCuenta } from './fetch'
import { listCuentas } from './list'

export async function insertCuentaRemoto(
  _userId: string,
  input: CuentaInput,
): Promise<{ data: Cuenta | null; error: string | null }> {
  const row: Record<string, unknown> = {
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    saldo_actual: input.saldo_actual ?? 0,
  }

  if (input.tipo === 'credito') {
    row.limite_credito = input.limite_credito ?? null
    if (input.dia_corte != null) {
      row.dia_corte = input.dia_corte
    }
    if (input.dia_pago != null) {
      row.dia_pago = input.dia_pago
    }
  }

  const { data, error } = await supabase
    .from('cuentas')
    .insert(row)
    .select(CUENTA_SELECT_BASE)
    .single()

  if (error) return { data: null, error: error.message }

  const cuenta = mapCuenta({
    ...data,
    dia_corte: input.tipo === 'credito' ? (input.dia_corte ?? null) : null,
    dia_pago: input.tipo === 'credito' ? (input.dia_pago ?? null) : null,
  })

  return { data: cuenta, error: null }
}

async function queueCuentaOffline(
  userId: string,
  input: CuentaInput,
): Promise<{ data: Cuenta | null; error: string | null }> {
  const tempCuentaId = `pending-${crypto.randomUUID()}`
  const saldo = input.saldo_actual ?? 0

  await addPendingCuenta({
    tempCuentaId,
    userId,
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    saldo_actual: saldo,
    limite_credito: input.tipo === 'credito' ? (input.limite_credito ?? null) : null,
    dia_corte: input.tipo === 'credito' ? (input.dia_corte ?? null) : null,
    dia_pago: input.tipo === 'credito' ? (input.dia_pago ?? null) : null,
  })

  const cuenta: Cuenta = {
    id: tempCuentaId,
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    saldo_actual: saldo,
    limite_credito: input.tipo === 'credito' ? (input.limite_credito ?? null) : null,
    dia_corte: input.tipo === 'credito' ? (input.dia_corte ?? null) : null,
    dia_pago: input.tipo === 'credito' ? (input.dia_pago ?? null) : null,
  }

  appendToCache(userId, cuenta)
  return { data: cuenta, error: null }
}

export async function ensureCuentaEfectivo(
  userId: string,
): Promise<{ data: Cuenta | null; error: string | null }> {
  const { data: existing } = await listCuentas(userId)
  const efectivo = existing.find((c) => c.tipo === 'efectivo')
  if (efectivo) return { data: efectivo, error: null }

  return createCuenta(userId, {
    nombre: 'Efectivo',
    tipo: 'efectivo',
    saldo_actual: 0,
  })
}

export async function createCuenta(
  userId: string,
  input: CuentaInput,
): Promise<{ data: Cuenta | null; error: string | null }> {
  if (!isOnline()) {
    return queueCuentaOffline(userId, input)
  }

  const { data, error } = await insertCuentaRemoto(userId, input)
  if (error || !data) return { data: null, error }

  appendToCache(userId, data)
  return { data, error: null }
}

export async function updateCuenta(
  userId: string,
  cuentaId: string,
  input: Partial<CuentaInput>,
): Promise<{ data: Cuenta | null; error: string | null }> {
  if (!isOnline()) {
    return offlineServiceError('Sin conexión. Conéctate para editar la cuenta.')
  }

  const row: Record<string, unknown> = {}
  if (input.nombre !== undefined) row.nombre = input.nombre.trim()
  if (input.tipo !== undefined) row.tipo = input.tipo
  if (input.saldo_actual !== undefined) row.saldo_actual = input.saldo_actual
  if (input.limite_credito !== undefined) row.limite_credito = input.limite_credito
  if (input.dia_corte !== undefined) row.dia_corte = input.dia_corte
  if (input.dia_pago !== undefined) row.dia_pago = input.dia_pago

  const { data, error } = await supabase
    .from('cuentas')
    .update(row)
    .eq('id', cuentaId)
    .eq('user_id', userId)
    .select(CUENTA_SELECT)
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'No se pudo actualizar.' }

  const cuenta = mapCuenta(data)
  const cached = readCache(userId).map((c) => (c.id === cuentaId ? cuenta : c))
  writeCache(userId, cached)
  return { data: cuenta, error: null }
}
