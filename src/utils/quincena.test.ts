import { describe, expect, it } from 'vitest'
import { getDaysRemainingInQuincena } from './date'
import {
  getQuincenaPeriodo,
  getQuincenaRange,
  isDateInQuincena,
  sumRecibosPendientesQuincena,
} from './quincena'

describe('quincena utils', () => {
  it('identifica la primera quincena', () => {
    expect(getQuincenaPeriodo(new Date(2026, 6, 10))).toBe(1)
    expect(getQuincenaPeriodo(new Date(2026, 6, 20))).toBe(2)
  })

  it('calcula días restantes de la quincena', () => {
    expect(getDaysRemainingInQuincena(new Date(2026, 6, 10))).toBe(6)
    expect(getDaysRemainingInQuincena(new Date(2026, 6, 20))).toBe(12)
  })

  it('define el rango de la primera quincena', () => {
    const fecha = new Date(2026, 6, 8)
    const { inicio, fin, periodo } = getQuincenaRange(fecha)
    expect(periodo).toBe(1)
    expect(inicio).toEqual(new Date(2026, 6, 1))
    expect(fin).toEqual(new Date(2026, 6, 16))
  })

  it('detecta si una fecha cae en la quincena actual', () => {
    const ref = new Date(2026, 6, 10)
    expect(isDateInQuincena(new Date(2026, 6, 5), ref)).toBe(true)
    expect(isDateInQuincena(new Date(2026, 6, 20), ref)).toBe(false)
  })

  it('suma recibos pendientes solo de la quincena actual', () => {
    const total = sumRecibosPendientesQuincena(
      [
        { id: 1, descripcion: 'Netflix', monto: 199, categoria: 'Suscripciones', dia_mes: 20, ultimo_registro: null },
        { id: 2, descripcion: 'Luz', monto: 500, categoria: 'Casa', dia_mes: 12, ultimo_registro: null },
      ],
      10,
    )
    expect(total).toBe(500)
  })
})
