import { describe, expect, it } from 'vitest'
import { CATEGORIA_TRANSFERENCIA } from '../../types/gasto'
import { filterGastosPresupuestables, sumGastosPresupuestables } from './gastoPresupuesto'

describe('gastoPresupuesto', () => {
  it('sumGastosPresupuestables excluye transferencias', () => {
    expect(
      sumGastosPresupuestables([
        { categoria: 'Comida', total: 300 },
        { categoria: CATEGORIA_TRANSFERENCIA, total: 500 },
        { categoria: 'Transporte', monto: 200 },
      ]),
    ).toBe(500)
  })

  it('filterGastosPresupuestables elimina transferencias', () => {
    const rows = filterGastosPresupuestables([
      { categoria: 'Comida', monto: 100 },
      { categoria: CATEGORIA_TRANSFERENCIA, monto: 999 },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].categoria).toBe('Comida')
  })
})
