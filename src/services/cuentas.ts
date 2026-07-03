import type { Cuenta, CuentaInput } from '../types/cuenta'
import { supabase } from './supabase'

const CUENTA_SELECT = 'id, nombre, tipo, limite_credito, saldo_actual' as const

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

function writeCache(userId: string, cuentas: Cuenta[]) {
  localStorage.setItem(cacheKey(userId), JSON.stringify(cuentas))
}

function mapCuenta(row: Record<string, unknown>): Cuenta {
  return {
    id: String(row.id),
    nombre: String(row.nombre),
    tipo: row.tipo as Cuenta['tipo'],
    limite_credito: row.limite_credito != null ? Number(row.limite_credito) : null,
    saldo_actual: Number(row.saldo_actual),
  }
}

export async function listCuentas(
  userId: string,
): Promise<{ data: Cuenta[]; error: string | null; fromCache: boolean }> {
  if (!navigator.onLine) {
    return { data: readCache(userId), error: null, fromCache: true }
  }

  const { data, error } = await supabase
    .from('cuentas')
    .select(CUENTA_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

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
  if (!navigator.onLine) {
    return { data: null, error: 'Sin conexión. Conéctate para registrar una cuenta.' }
  }

  const row: Record<string, unknown> = {
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    saldo_actual: input.saldo_actual ?? 0,
  }

  if (input.tipo === 'credito') {
    row.limite_credito = input.limite_credito ?? null
  }

  const { data, error } = await supabase
    .from('cuentas')
    .insert(row)
    .select(CUENTA_SELECT)
    .single()

  if (error) return { data: null, error: error.message }

  const cuenta = mapCuenta(data)
  writeCache(userId, [...readCache(userId), cuenta])
  return { data: cuenta, error: null }
}

export function getDefaultCuentaId(cuentas: Cuenta[]): string | null {
  if (cuentas.length === 0) return null
  const preferred = cuentas.find((c) => c.tipo === 'efectivo' || c.tipo === 'debito')
  return preferred?.id ?? cuentas[0].id
}
