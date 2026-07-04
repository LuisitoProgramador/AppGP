import { describe, expect, it } from 'vitest'
import {
  addMonths,
  fromMonthInputValue,
  getDaysRemainingInMonth,
  getMonthFechaBounds,
  getMonthRange,
  isCurrentMonth,
  isFechaInMonth,
  shiftMonth,
  toGastoFecha,
  toMonthInputValue,
} from '../date'

describe('date utils', () => {
  it('calcula el rango del mes', () => {
    const fecha = new Date(2026, 2, 15)
    const { inicio, fin } = getMonthRange(fecha)

    expect(inicio).toEqual(new Date(2026, 2, 1))
    expect(fin).toEqual(new Date(2026, 3, 1))
  })

  it('calcula días restantes incluyendo hoy', () => {
    const fecha = new Date(2026, 2, 15)
    expect(getDaysRemainingInMonth(fecha)).toBe(17)
  })

  it('detecta si es el mes actual', () => {
    const hoy = new Date()
    expect(isCurrentMonth(hoy)).toBe(true)
    expect(isCurrentMonth(shiftMonth(hoy, -1))).toBe(false)
  })

  it('convierte valores de input month', () => {
    const fecha = new Date(2026, 2, 1)
    expect(toMonthInputValue(fecha)).toBe('2026-03')
    expect(fromMonthInputValue('2026-03')).toEqual(new Date(2026, 2, 1))
  })

  it('genera fecha de gasto anclada a mediodía en México', () => {
    const fecha = new Date(2026, 6, 4, 8, 0, 0)
    expect(toGastoFecha(fecha)).toBe('2026-07-04T12:00:00-06:00')
  })

  it('calcula límites de mes para consultas en México', () => {
    const julio = new Date(2026, 6, 1)
    expect(getMonthFechaBounds(julio)).toEqual({
      inicio: '2026-07-01T00:00:00-06:00',
      fin: '2026-08-01T00:00:00-06:00',
    })
  })

  it('detecta si una fecha pertenece al mes seleccionado', () => {
    const julio = new Date(2026, 6, 1)
    expect(isFechaInMonth('2026-07-04T12:00:00-06:00', julio)).toBe(true)
    expect(isFechaInMonth('2026-06-30T23:00:00.000Z', julio)).toBe(false)
  })

  it('suma meses respetando fin de mes (31 ene -> 28 feb)', () => {
    const enero31 = new Date(2026, 0, 31)
    const febrero = addMonths(enero31, 1)
    expect(febrero.getMonth()).toBe(1)
    expect(febrero.getDate()).toBe(28)

    const diciembre = addMonths(new Date(2026, 10, 15), 1)
    expect(diciembre.getFullYear()).toBe(2026)
    expect(diciembre.getMonth()).toBe(11)
  })
})
