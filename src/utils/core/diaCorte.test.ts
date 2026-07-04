import { describe, expect, it } from 'vitest'
import { getCorteEstado } from './diaCorte'

describe('getCorteEstado', () => {
  it('detecta corte próximo dentro de 3 días', () => {
    expect(getCorteEstado(15, new Date(2026, 6, 13))).toBe('proximo')
    expect(getCorteEstado(15, new Date(2026, 6, 12))).toBe('proximo')
  })

  it('detecta mejor momento 1-2 días después del corte', () => {
    expect(getCorteEstado(15, new Date(2026, 6, 16))).toBe('mejor_momento')
    expect(getCorteEstado(15, new Date(2026, 6, 17))).toBe('mejor_momento')
  })

  it('retorna null sin dia_corte', () => {
    expect(getCorteEstado(null)).toBeNull()
  })
})
