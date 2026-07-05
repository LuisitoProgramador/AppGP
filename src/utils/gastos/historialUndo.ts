import type { GastoInsertFields } from '../../types/gasto'
import type { SaldoRevertAlEliminar } from './gastoSaldo'
import { montoSaldoAlRegistrar } from './gastoSaldo'

export interface GastoEliminadoSnapshot {
  row: GastoInsertFields
  saldoAplicado: SaldoRevertAlEliminar | null
}

export function buildGastoEliminadoSnapshot(
  item: {
    monto: number
    categoria: string
    descripcion: string | null
    fecha: string
    cuenta_id?: string | null
    es_msi?: boolean
    grupo_msi_id?: string | null
    total_compra_msi?: number | null
  },
  saldoRevert: SaldoRevertAlEliminar | null,
): GastoEliminadoSnapshot {
  return {
    row: {
      monto: Number(item.monto),
      categoria: item.categoria,
      descripcion: item.descripcion ?? '',
      fecha: item.fecha,
      cuenta_id: item.cuenta_id ?? null,
      es_msi: Boolean(item.es_msi),
      grupo_msi_id: item.grupo_msi_id ?? null,
      total_compra_msi: item.total_compra_msi ?? null,
    },
    saldoAplicado: saldoRevert,
  }
}

export function montoSaldoAlRestaurar(snapshot: GastoEliminadoSnapshot): number {
  if (snapshot.saldoAplicado) {
    return snapshot.saldoAplicado.monto
  }

  const { row } = snapshot
  if (row.es_msi) {
    const totalCompra = row.total_compra_msi
    if (totalCompra != null && totalCompra > 0) {
      return Number(totalCompra)
    }
    return montoSaldoAlRegistrar(row.monto, true, row.monto)
  }

  return montoSaldoAlRegistrar(row.monto, false)
}
