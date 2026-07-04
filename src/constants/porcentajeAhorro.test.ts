import { describe, expect, it } from 'vitest'
import { validatePorcentajeAhorro } from './porcentajeAhorro'

describe('validatePorcentajeAhorro', () => {
  it('acepta valores del slider', () => {
    expect(validatePorcentajeAhorro(15)).toBeNull()
    expect(validatePorcentajeAhorro(50)).toBeNull()
  })

  it('rechaza valores fuera de rango o sin paso de 5', () => {
    expect(validatePorcentajeAhorro(4)).not.toBeNull()
    expect(validatePorcentajeAhorro(55)).not.toBeNull()
    expect(validatePorcentajeAhorro(12)).toContain('múltiplo')
  })
})
