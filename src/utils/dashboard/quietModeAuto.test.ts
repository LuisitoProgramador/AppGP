import { describe, expect, it } from 'vitest'
import { isGastoFechaPasada } from '../date'
import {
  isDiaDePago,
  isFinDeSemana,
  shouldAutoActivarModoTranquilo,
  UMBRAL_SEGURIDAD,
} from './quietModeAuto'

describe('quietModeAuto', () => {
  it('detecta fin de semana', () => {
    expect(isFinDeSemana(new Date(2026, 6, 4))).toBe(true) // sábado
    expect(isFinDeSemana(new Date(2026, 6, 6))).toBe(false) // lunes
  })

  it('detecta día de pago', () => {
    expect(isDiaDePago(new Date(2026, 6, 15), 15)).toBe(true)
    expect(isDiaDePago(new Date(2026, 6, 15), 5)).toBe(false)
  })

  it('activa modo tranquilo en fin de semana con saldo seguro', () => {
    expect(
      shouldAutoActivarModoTranquilo({
        disponible: UMBRAL_SEGURIDAD + 1,
        diaPago: 5,
        fecha: new Date(2026, 6, 4),
      }),
    ).toBe(true)
  })

  it('activa modo tranquilo en día de pago con saldo seguro', () => {
    expect(
      shouldAutoActivarModoTranquilo({
        disponible: 5000,
        diaPago: 15,
        fecha: new Date(2026, 6, 15),
      }),
    ).toBe(true)
  })

  it('no activa si el disponible está por debajo del umbral', () => {
    expect(
      shouldAutoActivarModoTranquilo({
        disponible: UMBRAL_SEGURIDAD,
        diaPago: 15,
        fecha: new Date(2026, 6, 15),
      }),
    ).toBe(false)
  })
})

describe('isGastoFechaPasada', () => {
  it('marca fechas anteriores a hoy (America/Mexico_City) como pasadas', () => {
    const hoy = new Date('2026-07-15T14:00:00.000Z')
    expect(isGastoFechaPasada('2026-07-14T12:00:00.000Z', hoy)).toBe(true)
    expect(isGastoFechaPasada('2026-07-15T12:00:00.000Z', hoy)).toBe(false)
  })

  it('usa calendario de Mexico City, no UTC', () => {
    const hoy = new Date('2026-07-15T14:00:00.000Z')
    // 05:00 UTC = 23:00 del 14 en Ciudad de México (UTC-6)
    expect(isGastoFechaPasada('2026-07-15T05:00:00.000Z', hoy)).toBe(true)
    // 06:00 UTC = 00:00 del 15 en Ciudad de México
    expect(isGastoFechaPasada('2026-07-15T06:00:00.000Z', hoy)).toBe(false)
  })
})
