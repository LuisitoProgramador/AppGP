import { describe, expect, it } from 'vitest'
import { calcFlujoEfectivoAlertas } from './flujoEfectivoAsistente'

describe('calcFlujoEfectivoAlertas', () => {
  it('recomienda apartar cuando la salida supera el disponible', () => {
    const alertas = calcFlujoEfectivoAlertas({
      salidas: [
        { dia: 15, etiqueta: 'Renta', monto: 8000, tipo: 'recurrente' },
      ],
      diaActual: 4,
      disponible: 3000,
    })

    expect(alertas).toHaveLength(1)
    expect(alertas[0].reservaRecomendada).toBe(5000)
    expect(alertas[0].urgente).toBe(true)
    expect(alertas[0].mensaje).toContain('día 15')
    expect(alertas[0].mensaje).toContain('5,000')
  })

  it('sugiere ahorro diario cuando hay cobertura pero la salida es fuerte', () => {
    const alertas = calcFlujoEfectivoAlertas({
      salidas: [
        { dia: 20, etiqueta: 'Netflix', monto: 600, tipo: 'recurrente' },
      ],
      diaActual: 10,
      disponible: 5000,
    })

    expect(alertas).toHaveLength(1)
    expect(alertas[0].reservaRecomendada).toBe(60)
    expect(alertas[0].mensaje).toContain('/día')
  })

  it('ignora salidas pasadas y pequeñas', () => {
    const alertas = calcFlujoEfectivoAlertas({
      salidas: [
        { dia: 2, etiqueta: 'Cafe', monto: 50, tipo: 'recurrente' },
        { dia: 25, etiqueta: 'Spotify', monto: 99, tipo: 'recurrente' },
      ],
      diaActual: 10,
      disponible: 8000,
      umbralFuerte: 500,
    })

    expect(alertas).toHaveLength(0)
  })
})
