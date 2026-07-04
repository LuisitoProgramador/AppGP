import { describe, expect, it } from 'vitest'
import {
  calcAhorroMensual503020,
  calcLimiteCategoria503020,
  calcLimitesRegla503020,
  calcResumenBuckets503020,
  calcTotalBucket503020,
} from './regla503020'
import { CATEGORIAS_DEFAULT } from '../types/gasto'

describe('regla503020', () => {
  const ingreso = 10_000

  it('calcula límites que suman 80% del ingreso', () => {
    const limites = calcLimitesRegla503020(ingreso, CATEGORIAS_DEFAULT)
    const total = Object.values(limites).reduce((a, b) => a + b, 0)
    expect(total).toBe(8000)
  })

  it('asigna 50% a necesidades y 30% a caprichos por categoría', () => {
    expect(calcLimiteCategoria503020(ingreso, 'Casa')).toBe(2000)
    expect(calcLimiteCategoria503020(ingreso, 'Compras')).toBe(1650)
  })

  it('calcula ahorro al 20%', () => {
    expect(calcAhorroMensual503020(ingreso)).toBe(2000)
  })

  it('calcula totales por bucket', () => {
    expect(calcTotalBucket503020(ingreso, 'necesidades')).toBe(5000)
    expect(calcTotalBucket503020(ingreso, 'caprichos')).toBe(3000)
  })

  it('resume gasto por bucket', () => {
    const resumen = calcResumenBuckets503020(ingreso, {
      Comida: 1000,
      Compras: 500,
    })
    expect(resumen[0].gastado).toBe(1000)
    expect(resumen[1].gastado).toBe(500)
  })
})
