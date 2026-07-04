import { describe, expect, it } from 'vitest'
import { montoSaldoAlEliminarPendiente, saldoDeltaAlCorregirMsiGrupo, saldoRevertAlEliminar, sumMsiGrupoMontos } from './gastoSaldo'

describe('gastoSaldo', () => {
  it('revierte el total MSI en gastos pendientes', () => {
    expect(
      montoSaldoAlEliminarPendiente({
        monto: 3000,
        msiInstallments: [{ monto: 1000 } as never],
      }),
    ).toBe(3000)
  })

  it('revierte solo el monto en gastos normales', () => {
    expect(montoSaldoAlEliminarPendiente({ monto: 150 })).toBe(150)
  })

  it('no revierte saldo MSI si quedan cuotas hermanas', () => {
    const result = saldoRevertAlEliminar(
      {
        id: 1,
        monto: 1000,
        cuenta_id: 'c1',
        es_msi: true,
        grupo_msi_id: 'g1',
      },
      [
        { id: 1, monto: 1000 },
        { id: 2, monto: 1000 },
      ],
    )
    expect(result).toBeNull()
  })

  it('revierte el total del grupo MSI al borrar la última cuota', () => {
    const result = saldoRevertAlEliminar(
      {
        id: 1,
        monto: 1000,
        cuenta_id: 'c1',
        es_msi: true,
        grupo_msi_id: 'g1',
      },
      [{ id: 1, monto: 1000 }],
    )
    expect(result).toEqual({ cuentaId: 'c1', monto: 1000 })
  })

  it('revierte el total MSI legacy sin grupo_msi_id al borrar la última cuota', () => {
    const result = saldoRevertAlEliminar(
      {
        id: 3,
        monto: 1000,
        descripcion: 'Laptop (MSI 3/3)',
        cuenta_id: 'c1',
        es_msi: true,
        grupo_msi_id: null,
      },
      [{ id: 3, monto: 1000 }],
    )
    expect(result).toEqual({ cuentaId: 'c1', monto: 3000 })
  })

  it('calcula delta de saldo al corregir total MSI', () => {
    expect(saldoDeltaAlCorregirMsiGrupo(3000, 3500)).toBe(500)
    expect(saldoDeltaAlCorregirMsiGrupo(3000, 2800)).toBe(-200)
  })

  it('suma montos de un grupo MSI', () => {
    expect(sumMsiGrupoMontos([{ monto: 100 }, { monto: 200.5 }])).toBe(300.5)
  })
})
