import type { Cuenta, CuentaInput, PendingCuenta } from '../types/cuenta'
import { calcSaldoAfterGasto, revertSaldoAfterGasto } from '../utils/cuentaSaldo'
import { isOnline, offlineServiceError } from '../utils/network'
import { addPendingCuenta, getPendingCuentas, getPendingGastosCount } from './offlineQueue'
import { supabase } from './supabase'

const CUENTA_SELECT_BASE = 'id, nombre, tipo, limite_credito, saldo_actual' as const
const CUENTA_SELECT_CORTE = `${CUENTA_SELECT_BASE}, dia_corte` as const
const CUENTA_SELECT = `${CUENTA_SELECT_CORTE}, dia_pago` as const

type CuentaSelectMode = 'full' | 'corte' | 'base'
let cuentaSelectMode: CuentaSelectMode | null = null

async function fetchCuentasRows(userId: string) {
  if (cuentaSelectMode === 'full') {
    return supabase
      .from('cuentas')
      .select(CUENTA_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  }

  if (cuentaSelectMode === 'corte') {
    const withCorte = await supabase
      .from('cuentas')
      .select(CUENTA_SELECT_CORTE)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (!withCorte.error) {
      return {
        data: (withCorte.data ?? []).map((row) => ({ ...row, dia_pago: null })),
        error: null,
      }
    }
    cuentaSelectMode = null
  }

  if (cuentaSelectMode === 'base') {
    const base = await supabase
      .from('cuentas')
      .select(CUENTA_SELECT_BASE)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (!base.error) {
      return {
        data: (base.data ?? []).map((row) => ({ ...row, dia_corte: null, dia_pago: null })),
        error: null,
      }
    }
    cuentaSelectMode = null
  }

  const full = await supabase
    .from('cuentas')
    .select(CUENTA_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!full.error) {
    cuentaSelectMode = 'full'
    return full
  }

  const withCorte = await supabase
    .from('cuentas')
    .select(CUENTA_SELECT_CORTE)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!withCorte.error) {
    cuentaSelectMode = 'corte'
    return {
      data: (withCorte.data ?? []).map((row) => ({ ...row, dia_pago: null })),
      error: null,
    }
  }

  const base = await supabase
    .from('cuentas')
    .select(CUENTA_SELECT_BASE)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (base.error) return base

  cuentaSelectMode = 'base'
  return {
    data: (base.data ?? []).map((row) => ({ ...row, dia_corte: null, dia_pago: null })),
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
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(cuentas))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
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
    dia_pago: row.dia_pago != null ? Number(row.dia_pago) : null,
  }
}

export function pendingCuentaToCuenta(item: PendingCuenta): Cuenta {
  return {
    id: item.tempCuentaId,
    nombre: item.nombre,
    tipo: item.tipo,
    limite_credito: item.limite_credito,
    saldo_actual: item.saldo_actual,
    dia_corte: item.dia_corte,
    dia_pago: item.dia_pago,
  }
}

async function appendQueuedCuentas(userId: string, cuentas: Cuenta[]): Promise<Cuenta[]> {
  const pending = (await getPendingCuentas()).filter((item) => item.userId === userId)
  if (pending.length === 0) return cuentas

  const existingIds = new Set(cuentas.map((cuenta) => cuenta.id))
  const extras = pending
    .filter((item) => !existingIds.has(item.tempCuentaId))
    .map(pendingCuentaToCuenta)

  return extras.length > 0 ? [...cuentas, ...extras] : cuentas
}

export async function listCuentas(
  userId: string,
): Promise<{ data: Cuenta[]; error: string | null; fromCache: boolean }> {
  if (!isOnline()) {
    return { data: readCache(userId), error: null, fromCache: true }
  }

  const pendingGastosCount = await getPendingGastosCount()
  if (pendingGastosCount > 0) {
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
  const merged = await appendQueuedCuentas(userId, cuentas)
  writeCache(userId, merged)
  return { data: merged, error: null, fromCache: false }
}

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

function appendToCache(userId: string, item: Cuenta): void {
  const cached = readCache(userId)
  writeCache(userId, [...cached, item])
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
  let found = false
  const updated = cuentas.map((c) => {
    if (c.id !== cuentaId) return c
    found = true
    const newSaldo = calcSaldoAfterGasto(c.tipo, c.saldo_actual, monto)
    return { ...c, saldo_actual: newSaldo }
  })
  if (!found) return { cuentas, error: 'Cuenta no encontrada' }

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
  let found = false
  const updated = cuentas.map((c) => {
    if (c.id !== cuentaId) return c
    found = true
    const newSaldo = revertSaldoAfterGasto(c.tipo, c.saldo_actual, monto)
    return { ...c, saldo_actual: newSaldo }
  })
  if (!found) return cuentas

  writeCache(userId, updated)
  return updated
}

export async function realizarTransferencia(
  userId: string,
  origenId: string,
  destinoId: string,
  monto: number,
): Promise<{ error: string | null }> {
  if (!isOnline()) {
    return offlineServiceError('Sin conexión. Conéctate para realizar una transferencia.')
  }

  if (monto <= 0) {
    return { error: 'El monto debe ser mayor a 0.' }
  }

  const { error } = await supabase.rpc('realizar_transferencia', {
    p_origen_id: origenId,
    p_destino_id: destinoId,
    p_monto: monto,
  })

  if (error) return { error: error.message }

  await listCuentas(userId)

  return { error: null }
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
