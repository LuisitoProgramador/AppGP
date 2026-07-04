import type { GastoInsertFields } from '../../types/gasto'
import type { SaldoRevertAlEliminar } from './gastoSaldo'
import { montoSaldoAlRegistrar, sumMsiGrupoMontos } from './gastoSaldo'
import { parseMsiDescripcion, splitMsiAmount } from './msi'

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

  const { row } = snapshot
  if (row.es_msi) {
    const parsed = parseMsiDescripcion(row.descripcion)
    if (parsed && parsed.total > 1) {
      const inferredTotal = Math.round(row.monto * parsed.total * 100) / 100
      return sumMsiGrupoMontos(
        splitMsiAmount(inferredTotal, parsed.total).map((monto) => ({ monto })),
      )
    }
    return montoSaldoAlRegistrar(row.monto, true, row.monto)
  }

  return montoSaldoAlRegistrar(row.monto, false)
}
