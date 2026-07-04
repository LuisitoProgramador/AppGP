import { describe, expect, it } from 'vitest'
import {
  aggregateGastosPorCategoriaPadre,
  buildCategoriaConSub,
  categoriaPadre,
  parseCategoriaParts,
} from './subcategorias'

describe('subcategorias', () => {
  it('combina y separa categoría padre', () => {
    expect(buildCategoriaConSub('Comida', 'Restaurantes')).toBe('Comida › Restaurantes')
    expect(categoriaPadre('Comida › Restaurantes')).toBe('Comida')
    expect(parseCategoriaParts('Comida › Restaurantes')).toEqual({
      padre: 'Comida',
      sub: 'Restaurantes',
    })
  })

  it('agrupa gastos por categoría padre', () => {
    expect(
      aggregateGastosPorCategoriaPadre({
        Comida: 100,
        'Comida › Oxxo': 50,
        Transporte: 30,
      }),
    ).toEqual({
      Comida: 150,
      Transporte: 30,
    })
  })
})
