import { describe, expect, it } from 'vitest'
import {
  calcAhorroMensual503020,
  calcDisponibleGasto503020,
  calcLimiteCategoria503020,
  calcLimitesRegla503020,
  calcPorcentajesRegla503020,
  calcResumenBuckets503020,
  calcTotalBucket503020,
} from './regla503020'
import { CATEGORIAS_DEFAULT } from '../../types/gasto'

describe('regla503020', () => {
  const ingreso = 10_000

  it('con 20% de ahorro mantiene la regla clásica 50/30/20', () => {
    expect(calcPorcentajesRegla503020(20)).toEqual({
      necesidades: 50,
      caprichos: 30,
      ahorro: 20,
    })
    expect(calcDisponibleGasto503020(ingreso, 20)).toBe(8000)

    const limites = calcLimitesRegla503020(ingreso, CATEGORIAS_DEFAULT, 20)
    const total = Object.values(limites).reduce((a, b) => a + b, 0)
    expect(total).toBe(8000)
    expect(calcLimiteCategoria503020(ingreso, 'Casa', 20)).toBe(2000)
    expect(calcLimiteCategoria503020(ingreso, 'Compras', 20)).toBe(1650)
    expect(calcAhorroMensual503020(ingreso, 20)).toBe(2000)
    expect(calcTotalBucket503020(ingreso, 'necesidades', 20)).toBe(5000)
    expect(calcTotalBucket503020(ingreso, 'caprichos', 20)).toBe(3000)
  })

  it('con 40% de ahorro reparte el 60% restante en 50/30 sin superar el 100%', () => {
    const pct = calcPorcentajesRegla503020(40)
    expect(pct.necesidades + pct.caprichos + pct.ahorro).toBe(100)

    expect(calcAhorroMensual503020(ingreso, 40)).toBe(4000)
    expect(calcTotalBucket503020(ingreso, 'necesidades', 40)).toBe(3750)
    expect(calcTotalBucket503020(ingreso, 'caprichos', 40)).toBe(2250)

    const limites = calcLimitesRegla503020(ingreso, CATEGORIAS_DEFAULT, 40)
    const total = Object.values(limites).reduce((a, b) => a + b, 0)
    expect(total).toBe(6000)
  })

  it('resume gasto por bucket', () => {
    const resumen = calcResumenBuckets503020(
      ingreso,
      {
        Comida: 1000,
        Compras: 500,
      },
      20,
    )
    expect(resumen[0].gastado).toBe(1000)
    expect(resumen[1].gastado).toBe(500)
  })
})
