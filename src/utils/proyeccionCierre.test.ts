import { describe, expect, it } from 'vitest'
import { calcProyeccionCierre } from './proyeccionCierre'

describe('proyeccionCierre', () => {
  it('proyecta saldo positivo al cierre', () => {
    const result = calcProyeccionCierre({
      limiteMensual: 10000,
      gastoTotal: 2000,
      diaActual: 10,
      diasRestantes: 20,
    })

    expect(result?.enNegativo).toBe(false)
    expect(result?.saldoProyectado).toBe(4000)
  })

  it('detecta cierre en negativo', () => {
    const result = calcProyeccionCierre({
      limiteMensual: 10000,
      gastoTotal: 6000,
      diaActual: 10,
      diasRestantes: 20,
    })

    expect(result?.enNegativo).toBe(true)
    expect(result?.saldoProyectado).toBeLessThan(0)
  })
})
