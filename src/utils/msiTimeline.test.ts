import { describe, expect, it } from 'vitest'
import { filterMsiForMonth, isMonthInMsiCompromisosWindow } from './msiTimeline'

describe('msiTimeline', () => {
  const now = new Date(2026, 6, 4)

  it('detecta meses dentro de la ventana de compromisos MSI', () => {
    expect(isMonthInMsiCompromisosWindow(new Date(2026, 6, 1), now)).toBe(true)
    expect(isMonthInMsiCompromisosWindow(new Date(2026, 9, 1), now)).toBe(true)
    expect(isMonthInMsiCompromisosWindow(new Date(2026, 5, 1), now)).toBe(false)
    expect(isMonthInMsiCompromisosWindow(new Date(2026, 10, 1), now)).toBe(false)
  })

  it('filtra cuotas MSI por mes', () => {
    const gastos = [
      { monto: 100, fecha: '2026-07-05' },
      { monto: 200, fecha: '2026-08-02' },
    ]

    expect(filterMsiForMonth(gastos, new Date(2026, 6, 1))).toEqual([gastos[0]])
  })
})
