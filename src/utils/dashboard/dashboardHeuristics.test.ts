import { describe, expect, it } from 'vitest'
import { findDuplicadoHoy } from '../gastos/duplicateGasto'
import { proyectarDiaAgotamiento } from './limitProjection'
import { detectarRecurrentesSugeridos } from './detectarRecurrentes'

describe('limitProjection', () => {
  it('proyecta el día de agotamiento', () => {
    expect(proyectarDiaAgotamiento(5000, 10000, 10)).toBe(20)
  })

  it('no proyecta si ya se agotó', () => {
    expect(proyectarDiaAgotamiento(10000, 10000, 10)).toBeNull()
  })
})

describe('duplicateGasto', () => {
  it('detecta duplicados del mismo día', () => {
    const dup = findDuplicadoHoy('Oxxo', 45, [{ descripcion: 'Oxxo', monto: 45 }])
    expect(dup?.descripcion).toBe('Oxxo')
  })
})

describe('detectarRecurrentesSugeridos', () => {
  it('sugiere pagos en 3 meses distintos', () => {
    const sugeridos = detectarRecurrentesSugeridos(
      [
        { descripcion: 'Netflix', monto: 199, categoria: 'Suscripciones', fecha: '2026-01-15T12:00:00Z' },
        { descripcion: 'Netflix', monto: 199, categoria: 'Suscripciones', fecha: '2026-02-15T12:00:00Z' },
        { descripcion: 'Netflix', monto: 199, categoria: 'Suscripciones', fecha: '2026-03-15T12:00:00Z' },
      ],
      [],
    )
    expect(sugeridos).toHaveLength(1)
    expect(sugeridos[0].descripcion).toBe('Netflix')
  })
})
