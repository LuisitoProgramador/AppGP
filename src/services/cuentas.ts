import type { Cuenta, CuentaInput } from '../types/cuenta'
import { calcSaldoAfterGasto, revertSaldoAfterGasto } from '../utils/cuentaSaldo'
import { isOnline, offlineServiceError } from '../utils/network'
import { getPendingGastos } from './offlineQueue'
import { supabase } from './supabase'

const CUENTA_SELECT_BASE = 'id, nombre, tipo, limite_credito, saldo_actual' as const
const CUENTA_SELECT = `${CUENTA_SELECT_BASE}, dia_corte` as const

async function fetchCuentasRows(userId: string) {
  const withCorte = await supabase
    .from('cuentas')
    .select(CUENTA_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!withCorte.error) return withCorte

  const withoutCorte = await supabase
    .from('cuentas')
    .select(CUENTA_SELECT_BASE)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (withoutCorte.error) return withoutCorte

  return {
    data: (withoutCorte.data ?? []).map((row) => ({ ...row, dia_corte: null })),
    error: null,
  }
}

function cacheKey(userId: string) {
  return `cuentas_${userId}`
}

function readCache(userId: string): Cuenta[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return []
    return JSON.parse(raw) as Cuenta[]
  } catch {
    return []
  }
}

export function getCachedCuentas(userId: string): Cuenta[] {
  return readCache(userId)
}

function writeCache(userId: string, cuentas: Cuenta[]) {
  localStorage.setItem(cacheKey(userId), JSON.stringify(cuentas))
}

export function setCachedCuentas(userId: string, cuentas: Cuenta[]) {
  writeCache(userId, cuentas)
}

export function resolveCuentasBase(userId: string, fallback: Cuenta[]): Cuenta[] {
  const cached = readCache(userId)
  return cached.length > 0 ? cached : fallback
}

function mapCuenta(row: Record<string, unknown>): Cuenta {
  return {
    id: String(row.id),
    nombre: String(row.nombre),
    tipo: row.tipo as Cuenta['tipo'],
    limite_credito: row.limite_credito != null ? Number(row.limite_credito) : null,
    saldo_actual: Number(row.saldo_actual),
    dia_corte: row.dia_corte != null ? Number(row.dia_corte) : null,
  }
}

export async function listCuentas(
  userId: string,
): Promise<{ data: Cuenta[]; error: string | null; fromCache: boolean }> {
  if (!isOnline()) {
    return { data: readCache(userId), error: null, fromCache: true }
  }

  const pending = await getPendingGastos()
  if (pending.length > 0) {
    const cached = readCache(userId)
    if (cached.length > 0) {
      return { data: cached, error: null, fromCache: true }
    }
  }

  const { data, error } = await fetchCuentasRows(userId)

  if (error) {
    const cached = readCache(userId)
    if (cached.length > 0) {
      return { data: cached, error: null, fromCache: true }
    }
    return { data: [], error: error.message, fromCache: false }
  }

  const cuentas = (data ?? []).map((row) => mapCuenta(row))
  writeCache(userId, cuentas)
  return { data: cuentas, error: null, fromCache: false }
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
    return offlineServiceError('Sin conexión. Conéctate para registrar una cuenta.')
  }

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
  })
  writeCache(userId, [...readCache(userId), cuenta])
  return { data: cuenta, error: null }
}

export function getDefaultCuentaId(cuentas: Cuenta[]): string | null {
  if (cuentas.length === 0) return null
  const preferred = cuentas.find((c) => c.tipo === 'efectivo' || c.tipo === 'debito')
  return preferred?.id ?? cuentas[0].id
}

export function applyGastoSaldoLocal(
  userId: string,
  cuentas: Cuenta[],
  cuentaId: string,
  monto: number,
): { cuentas: Cuenta[]; error: string | null } {
  const cuenta = cuentas.find((c) => c.id === cuentaId)
  if (!cuenta) return { cuentas, error: 'Cuenta no encontrada' }

  const newSaldo = calcSaldoAfterGasto(cuenta.tipo, cuenta.saldo_actual, monto)
  const updated = cuentas.map((c) =>
    c.id === cuentaId ? { ...c, saldo_actual: newSaldo } : c,
  )
  writeCache(userId, updated)
  return { cuentas: updated, error: null }
}

export async function persistCuentaSaldo(
  userId: string,
  cuentaId: string,
  saldoActual: number,
): Promise<{ error: string | null }> {
  if (!isOnline()) return { error: null }

  const { error } = await supabase
    .from('cuentas')
    .update({ saldo_actual: saldoActual })
    .eq('id', cuentaId)
    .eq('user_id', userId)

  return { error: error?.message ?? null }
}

export async function applyGastoToCuenta(
  userId: string,
  cuentas: Cuenta[],
  cuentaId: string,
  monto: number,
): Promise<{ cuentas: Cuenta[]; error: string | null }> {
  const { cuentas: updated, error: localError } = applyGastoSaldoLocal(
    userId,
    cuentas,
    cuentaId,
    monto,
  )
  if (localError) return { cuentas, error: localError }

  const cuenta = updated.find((c) => c.id === cuentaId)
  if (!cuenta) return { cuentas, error: 'Cuenta no encontrada' }

  const { error: persistError } = await persistCuentaSaldo(
    userId,
    cuentaId,
    cuenta.saldo_actual,
  )
  if (persistError) {
    writeCache(userId, cuentas)
    return { cuentas, error: persistError }
  }

  return { cuentas: updated, error: null }
}

export function revertGastoSaldoLocal(
  userId: string,
  cuentas: Cuenta[],
  cuentaId: string,
  monto: number,
): Cuenta[] {
  const cuenta = cuentas.find((c) => c.id === cuentaId)
  if (!cuenta) return cuentas

  const newSaldo = revertSaldoAfterGasto(cuenta.tipo, cuenta.saldo_actual, monto)
  const updated = cuentas.map((c) =>
    c.id === cuentaId ? { ...c, saldo_actual: newSaldo } : c,
  )
  writeCache(userId, updated)
  return updated
}

export async function registrarIngreso(
  userId: string,
  cuentaId: string,
  monto: number,
): Promise<{ error: string | null }> {
  if (!isOnline()) {
    return offlineServiceError('Sin conexión. Conéctate para registrar un ingreso.')
  }

  if (monto <= 0) {
    return { error: 'El monto debe ser mayor a 0.' }
  }

  const { data: cuentas, error: listError } = await listCuentas(userId)
  if (listError && cuentas.length === 0) {
    return { error: listError }
  }

  const cuenta = cuentas.find((c) => c.id === cuentaId)
  if (!cuenta) return { error: 'Cuenta no encontrada' }

  if (cuenta.tipo === 'credito') {
    return { error: 'Los ingresos solo se registran en cuentas de efectivo o débito.' }
  }

  const nuevoSaldo = revertSaldoAfterGasto(cuenta.tipo, cuenta.saldo_actual, monto)

  const { error: persistError } = await persistCuentaSaldo(userId, cuentaId, nuevoSaldo)
  if (persistError) return { error: persistError }

  const updated = cuentas.map((c) =>
    c.id === cuentaId ? { ...c, saldo_actual: nuevoSaldo } : c,
  )
  writeCache(userId, updated)

  return { error: null }
}
