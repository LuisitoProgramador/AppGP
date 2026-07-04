import type { GastoRecurrente, GastoRecurrenteInput } from '../types/gasto'
import { shouldRegisterRecurringToday } from '../utils/recurrentesPolicy'
import {
  applyGastoToCuenta,
  getDefaultCuentaId,
  listCuentas,
} from './cuentas'
import { supabase } from './supabase'

const GASTO_RECURRENTE_SELECT =
  'id, descripcion, monto, categoria, dia_mes, ultimo_registro, cuenta_id' as const

const GASTO_RECURRENTE_SELECT_LEGACY =
  'id, descripcion, monto, categoria, dia_mes, ultimo_registro' as const

function mapGastoRecurrente(row: Record<string, unknown>): GastoRecurrente {
  return {
    id: Number(row.id),
    descripcion: String(row.descripcion),
    monto: Number(row.monto),
    categoria: String(row.categoria),
    dia_mes: Number(row.dia_mes),
    ultimo_registro: row.ultimo_registro != null ? String(row.ultimo_registro) : null,
    cuenta_id: row.cuenta_id != null ? String(row.cuenta_id) : null,
  }
}

async function fetchGastosRecurrentesRows(userId: string) {
  const withCuenta = await supabase
    .from('gastos_recurrentes')
    .select(GASTO_RECURRENTE_SELECT)
    .eq('user_id', userId)
    .order('dia_mes', { ascending: true })

  if (!withCuenta.error) return withCuenta

  const legacy = await supabase
    .from('gastos_recurrentes')
    .select(GASTO_RECURRENTE_SELECT_LEGACY)
    .eq('user_id', userId)
    .order('dia_mes', { ascending: true })

  if (legacy.error) return legacy

  return {
    data: (legacy.data ?? []).map((row) => ({ ...row, cuenta_id: null })),
    error: null,
  }
}

export async function listGastosRecurrentes(
  userId: string,
): Promise<{ data: GastoRecurrente[]; error: string | null }> {
  const { data, error } = await fetchGastosRecurrentesRows(userId)

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []).map((row) => mapGastoRecurrente(row)), error: null }
}

export async function createGastoRecurrente(
  input: GastoRecurrenteInput,
): Promise<{ data: GastoRecurrente | null; error: string | null }> {
  const row: Record<string, unknown> = {
    descripcion: input.descripcion,
    monto: input.monto,
    categoria: input.categoria,
    dia_mes: input.dia_mes,
  }

  if (input.cuenta_id) {
    row.cuenta_id = input.cuenta_id
  }

  const { data, error } = await supabase
    .from('gastos_recurrentes')
    .insert(row)
    .select(GASTO_RECURRENTE_SELECT)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: mapGastoRecurrente(data), error: null }
}

export async function deleteGastoRecurrente(
  id: number,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('gastos_recurrentes').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function verificarGastosRecurrentes(userId: string): Promise<number> {
  const { data, error } = await fetchGastosRecurrentesRows(userId)

  if (error || !data?.length) return 0

  const now = new Date()
  const fecha = now.toISOString()
  let registered = 0
  const { data: cuentas } = await listCuentas(userId)

  for (const recurrente of data.map((row) => mapGastoRecurrente(row))) {
    if (!shouldRegisterRecurringToday(recurrente.dia_mes, recurrente.ultimo_registro, now)) {
      continue
    }

    const previousUltimoRegistro = recurrente.ultimo_registro
    let claimQuery = supabase
      .from('gastos_recurrentes')
      .update({ ultimo_registro: fecha })
      .eq('id', recurrente.id)
      .eq('user_id', userId)

    claimQuery = previousUltimoRegistro
      ? claimQuery.eq('ultimo_registro', previousUltimoRegistro)
      : claimQuery.is('ultimo_registro', null)

    const { data: claimed, error: claimError } = await claimQuery
      .select('id')
      .maybeSingle()

    if (claimError || !claimed) continue

    const cuentaId = recurrente.cuenta_id ?? getDefaultCuentaId(cuentas)

    const { error: insertError } = await supabase.from('gastos').insert({
      monto: recurrente.monto,
      categoria: recurrente.categoria,
      descripcion: recurrente.descripcion,
      fecha,
      cuenta_id: cuentaId,
    })

    if (insertError) {
      const rollbackQuery = supabase
        .from('gastos_recurrentes')
        .update({ ultimo_registro: previousUltimoRegistro })
        .eq('id', recurrente.id)
        .eq('user_id', userId)

      if (previousUltimoRegistro) {
        await rollbackQuery.eq('ultimo_registro', fecha)
      } else {
        await rollbackQuery.is('ultimo_registro', fecha)
      }

      continue
    }

    if (cuentaId) {
      await applyGastoToCuenta(userId, cuentas, cuentaId, Number(recurrente.monto))
    }

    registered += 1
  }

  return registered
}
