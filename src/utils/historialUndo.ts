import type { GastoInsertFields } from '../types/gasto'
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
    },
    saldoAplicado: saldoRevert,
  }
}

export function montoSaldoAlRestaurar(snapshot: GastoEliminadoSnapshot): number {
  if (snapshot.saldoAplicado) {
    return snapshot.saldoAplicado.monto
  }
  return montoSaldoAlRegistrar(snapshot.row.monto, snapshot.row.es_msi)
}
