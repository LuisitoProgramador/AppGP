import { describe, expect, it } from 'vitest'
import { buildGastoEliminadoSnapshot, montoSaldoAlRestaurar } from './historialUndo'

describe('historialUndo', () => {
  it('restaura MSI usando total_compra_msi persistido', () => {
    const snapshot = buildGastoEliminadoSnapshot(
      {
        monto: 333.34,
        categoria: 'Compras',
        descripcion: 'Laptop (MSI 1/3)',
        fecha: '2026-07-01',
        cuenta_id: 'c1',
        es_msi: true,
        grupo_msi_id: 'g1',
        total_compra_msi: 1000,
      },
      null,
    )

    expect(montoSaldoAlRestaurar(snapshot)).toBe(1000)
    expect(snapshot.row.total_compra_msi).toBe(1000)
  })

  it('usa saldoAplicado del snapshot cuando existe', () => {
    const snapshot = buildGastoEliminadoSnapshot(
      {
        monto: 500,
        categoria: 'Comida',
        descripcion: 'Cena',
        fecha: '2026-07-02',
        cuenta_id: 'c1',
        es_msi: false,
      },
      { cuentaId: 'c1', monto: 500 },
    )

    expect(montoSaldoAlRestaurar(snapshot)).toBe(500)
  })
})
