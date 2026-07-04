import { describe, expect, it } from 'vitest'
import { shouldShowBurnRateAlert } from './burnRate'

describe('shouldShowBurnRateAlert', () => {
  it('alerta si gastó más del 80% antes del día 15', () => {
    expect(shouldShowBurnRateAlert(8500, 10000, 10)).toBe(true)
  })

  it('no alerta si el mes va avanzado', () => {
    expect(shouldShowBurnRateAlert(8500, 10000, 20)).toBe(false)
  })

  it('no alerta si el gasto es bajo', () => {
    expect(shouldShowBurnRateAlert(5000, 10000, 5)).toBe(false)
  })
})
