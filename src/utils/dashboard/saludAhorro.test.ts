import { describe, expect, it } from 'vitest'
import { calcularSaludAhorro } from './saludAhorro'

describe('calcularSaludAhorro', () => {
  it('usa progreso de metas y presupuesto cuando hay metas', () => {
    const result = calcularSaludAhorro({
      metas: [
        { id: 1, nombre: 'Vacaciones', monto_objetivo: 1000, monto_actual: 500, fecha_limite: null },
      ],
      gastoTotal: 3000,
      limiteMensual: 10000,
      disponible: 7000,
    })

    expect(result.porcentaje).toBeGreaterThan(50)
    expect(result.nivel).toBe('alto')
  })

  it('usa solo presupuesto cuando no hay metas', () => {
    const result = calcularSaludAhorro({
      metas: [],
      gastoTotal: 2000,
      limiteMensual: 10000,
      disponible: 8000,
    })

    expect(result.porcentaje).toBe(80)
    expect(result.nivel).toBe('excelente')
  })
})
