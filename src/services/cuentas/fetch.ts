import type { Cuenta } from '../../types/cuenta'
import { supabase } from '../supabase'

export const CUENTA_SELECT_BASE =
  'id, nombre, tipo, limite_credito, saldo_actual, tasa_interes_mensual' as const
export const CUENTA_SELECT_CORTE = `${CUENTA_SELECT_BASE}, dia_corte` as const
export const CUENTA_SELECT = `${CUENTA_SELECT_CORTE}, dia_pago` as const

type CuentaSelectMode = 'full' | 'corte' | 'base'
let cuentaSelectMode: CuentaSelectMode | null = null

export async function fetchCuentasRows(userId: string) {
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
        data: (withCorte.data ?? []).map((row) => ({ ...row, dia_pago: null, tasa_interes_mensual: row.tasa_interes_mensual ?? null })),
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
        data: (base.data ?? []).map((row) => ({
          ...row,
          dia_corte: null,
          dia_pago: null,
          tasa_interes_mensual: row.tasa_interes_mensual ?? null,
        })),
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
      data: (withCorte.data ?? []).map((row) => ({ ...row, dia_pago: null, tasa_interes_mensual: row.tasa_interes_mensual ?? null })),
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
    data: (base.data ?? []).map((row) => ({
      ...row,
      dia_corte: null,
      dia_pago: null,
      tasa_interes_mensual: row.tasa_interes_mensual ?? null,
    })),
    error: null,
  }
}

export function mapCuenta(row: Record<string, unknown>): Cuenta {
  return {
    id: String(row.id),
    nombre: String(row.nombre),
    tipo: row.tipo as Cuenta['tipo'],
    limite_credito: row.limite_credito != null ? Number(row.limite_credito) : null,
    saldo_actual: Number(row.saldo_actual),
    dia_corte: row.dia_corte != null ? Number(row.dia_corte) : null,
    dia_pago: row.dia_pago != null ? Number(row.dia_pago) : null,
    tasa_interes_mensual:
      row.tasa_interes_mensual != null ? Number(row.tasa_interes_mensual) : null,
  }
}
