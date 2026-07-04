import { describe, expect, it } from 'vitest'
import {
  addMonths,
  fromMonthInputValue,
  getDaysRemainingInMonth,
  getMonthRange,
  isCurrentMonth,
  shiftMonth,
  toMonthInputValue,
} from './date'

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
