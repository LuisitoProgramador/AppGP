import { describe, expect, it } from 'vitest'
import { calcSafeToSpend, sumRecibosPendientes } from './safeToSpend'

describe('safeToSpend', () => {
  const recurrentes = [
    { id: 1, descripcion: 'Netflix', monto: 200, categoria: 'Suscripciones', dia_mes: 5, ultimo_registro: null },
    { id: 2, descripcion: 'Internet', monto: 500, categoria: 'Casa', dia_mes: 20, ultimo_registro: null },
    { id: 3, descripcion: 'Spotify', monto: 100, categoria: 'Suscripciones', dia_mes: 10, ultimo_registro: null },
  ]

  it('suma solo recibos con dia_mes mayor al día actual', () => {
    expect(sumRecibosPendientes(recurrentes, 12)).toBe(500)
    expect(sumRecibosPendientes(recurrentes, 25)).toBe(0)
  })

  it('resta recibos pendientes del disponible', () => {
    const result = calcSafeToSpend({
      limiteMensual: 10000,
      gastoTotal: 3000,
      recibosPendientes: 500,
      diasRestantes: 10,
    })

    expect(result.disponibleBruto).toBe(7000)
    expect(result.disponible).toBe(6500)
    expect(result.presupuestoDiario).toBe(650)
    expect(result.msiPendientes).toBe(0)
  })

  it('resta MSI pendientes del disponible', () => {
    const result = calcSafeToSpend({
      limiteMensual: 10000,
      gastoTotal: 3000,
      recibosPendientes: 500,
      msiPendientes: 800,
      diasRestantes: 10,
    })

    expect(result.disponible).toBe(5700)
    expect(result.presupuestoDiario).toBe(570)
  })
})
