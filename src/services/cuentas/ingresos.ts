import { revertSaldoAfterGasto } from '../../utils/core/cuentaSaldo'
import { isOnline } from '../../utils/core/network'
import { addPendingIngreso } from '../sync/offlineQueue'
import { supabase } from '../supabase'
import { writeCache } from './cache'
import { listCuentas } from './list'
import { applyIngresoSaldoLocal, persistCuentaSaldo } from './saldo'

export interface IngresoCuenta {
  id: number
  cuenta_id: string
  monto: number
  descripcion: string
  fecha: string
}

export async function listIngresosCuenta(
  userId: string,
  inicio: string,
  fin: string,
): Promise<{ data: IngresoCuenta[]; error: string | null }> {
  if (!isOnline()) return { data: [], error: null }

  const { data, error } = await supabase
    .from('ingresos_cuenta')
    .select('id, cuenta_id, monto, descripcion, fecha')
    .eq('user_id', userId)
    .gte('fecha', inicio)
    .lt('fecha', fin)
    .order('fecha', { ascending: false })

  if (error) return { data: [], error: error.message }

  return {
    data: (data ?? []).map((row) => ({
      id: Number(row.id),
      cuenta_id: String(row.cuenta_id),
      monto: Number(row.monto),
      descripcion: String(row.descripcion),
      fecha: String(row.fecha),
    })),
    error: null,
  }
}

export async function registrarIngreso(
  userId: string,
  cuentaId: string,
  monto: number,
  descripcion: string,
): Promise<{ error: string | null; offline?: boolean }> {
  if (monto <= 0) {
    return { error: 'El monto debe ser mayor a 0.' }
  }

  const descripcionLimpia = descripcion.trim()
  if (!descripcionLimpia) {
    return { error: 'La descripción es obligatoria.' }
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

  if (!isOnline()) {
    const { error: localError } = applyIngresoSaldoLocal(
      userId,
      cuentas,
      cuentaId,
      monto,
    )
    if (localError) return { error: localError }

    await addPendingIngreso({
      userId,
      cuenta_id: cuentaId,
      monto,
      descripcion: descripcionLimpia,
    })

    return { error: null, offline: true }
  }

  const nuevoSaldo = revertSaldoAfterGasto(cuenta.tipo, cuenta.saldo_actual, monto)
  const saldoAnterior = cuenta.saldo_actual

  const { error: persistError } = await persistCuentaSaldo(userId, cuentaId, nuevoSaldo)
  if (persistError) return { error: persistError }

  const { error: ingresoError } = await supabase.from('ingresos_cuenta').insert({
    cuenta_id: cuentaId,
    monto,
    descripcion: descripcionLimpia,
  })

  if (ingresoError) {
    await persistCuentaSaldo(userId, cuentaId, saldoAnterior)
    return { error: ingresoError.message }
  }

  const updated = cuentas.map((c) =>
    c.id === cuentaId ? { ...c, saldo_actual: nuevoSaldo } : c,
  )
  writeCache(userId, updated)

  return { error: null }
}
