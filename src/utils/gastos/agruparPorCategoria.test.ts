import { describe, expect, it } from 'vitest'
import { agruparPorCategoria } from './agruparPorCategoria'

describe('agruparPorCategoria', () => {
  it('agrupa montos y calcula porcentajes', () => {
    const resultado = agruparPorCategoria([
      { monto: 100, categoria: 'Comida' },
      { monto: 300, categoria: 'Transporte' },
      { monto: 100, categoria: 'Comida' },
    ])

    expect(resultado).toHaveLength(2)
    expect(resultado[0]).toMatchObject({
      categoria: 'Transporte',
      total: 300,
      porcentaje: 60,
    })
    expect(resultado[1]).toMatchObject({
      categoria: 'Comida',
      total: 200,
      porcentaje: 40,
    })
  })

  it('retorna arreglo vacío sin gastos', () => {
    expect(agruparPorCategoria([])).toEqual([])
  })

  it('excluye transferencias internas del total', () => {
    const resultado = agruparPorCategoria([
      { monto: 500, categoria: 'Comida' },
      { monto: 500, categoria: 'Transferencia' },
    ])

    expect(resultado).toHaveLength(1)
    expect(resultado[0]).toMatchObject({
      categoria: 'Comida',
      total: 500,
      porcentaje: 100,
    })
  })
})
