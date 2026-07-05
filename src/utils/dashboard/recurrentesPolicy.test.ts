import { describe, expect, it } from 'vitest'
import {
  alreadyRegisteredThisMonth,
  getBillingDate,
  getEffectiveBillingDay,
  matchesRecurrenteGasto,
  shouldRegisterRecurringToday,
} from './recurrentesPolicy'

describe('recurrentesPolicy', () => {
  it('ajusta dia_mes al último día del mes cuando excede', () => {
    expect(getEffectiveBillingDay(31, 2026, 1)).toBe(28)
    expect(getEffectiveBillingDay(31, 2024, 1)).toBe(29)
  })

  it('adelanta cobros de fin de semana al viernes', () => {
    const sundayBilling = getBillingDate(15, 2026, 2)
    expect(sundayBilling.getDay()).toBe(5)
    expect(sundayBilling.getDate()).toBe(13)
  })

  it('detecta si ya se registró en el mes actual', () => {
    const now = new Date(2026, 6, 20)
    expect(alreadyRegisteredThisMonth('2026-07-05T12:00:00.000Z', now)).toBe(true)
    expect(alreadyRegisteredThisMonth('2026-06-28T12:00:00.000Z', now)).toBe(false)
    expect(alreadyRegisteredThisMonth(null, now)).toBe(false)
  })

  it('registra cuando ya pasó el día de cobro y no hay registro del mes', () => {
    const now = new Date(2026, 6, 20)
    expect(shouldRegisterRecurringToday(15, null, now)).toBe(true)
    expect(shouldRegisterRecurringToday(25, null, now)).toBe(false)
  })

  it('no registra si ultimo_registro es del mes actual', () => {
    const now = new Date(2026, 6, 20)
    expect(shouldRegisterRecurringToday(15, '2026-07-10T12:00:00.000Z', now)).toBe(false)
  })

  it('detecta un gasto manual equivalente al recurrente', () => {
    expect(
      matchesRecurrenteGasto(
        { descripcion: 'Netflix', monto: 199, categoria: 'Suscripciones' },
        { descripcion: 'Netflix', monto: 199, categoria: 'Suscripciones' },
      ),
    ).toBe(true)
    expect(
      matchesRecurrenteGasto(
        { descripcion: 'Netflix', monto: 199, categoria: 'Suscripciones' },
        { descripcion: 'Spotify', monto: 199, categoria: 'Suscripciones' },
      ),
    ).toBe(false)
  })
})
