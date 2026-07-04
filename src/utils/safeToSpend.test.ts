import { describe, expect, it } from 'vitest'
import { calcSafeToSpend, sumRecibosPendientes } from './safeToSpend'

describe('safeToSpend', () => {
  const recurrentes = [
    { id: 1, descripcion: 'Netflix', monto: 200, categoria: 'Suscripciones', dia_mes: 5, ultimo_registro: null, cuenta_id: null },
    { id: 2, descripcion: 'Internet', monto: 500, categoria: 'Casa', dia_mes: 20, ultimo_registro: null, cuenta_id: null },
    { id: 3, descripcion: 'Spotify', monto: 100, categoria: 'Suscripciones', dia_mes: 10, ultimo_registro: null, cuenta_id: null },
  ]

  it('suma recurrentes no registrados en el mes', () => {
    expect(sumRecibosPendientes(recurrentes, new Date(2026, 6, 12))).toBe(800)
    const allRegistered = recurrentes.map((r) => ({
      ...r,
      ultimo_registro: '2026-07-15T12:00:00-06:00',
    }))
    expect(sumRecibosPendientes(allRegistered, new Date(2026, 6, 12))).toBe(0)
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

  it('expone MSI pendientes sin restarlos del disponible (ya están en gastoTotal)', () => {
    const result = calcSafeToSpend({
      limiteMensual: 10000,
      gastoTotal: 3000,
      recibosPendientes: 500,
      msiPendientes: 800,
      diasRestantes: 10,
    })

    expect(result.disponible).toBe(6500)
    expect(result.msiPendientes).toBe(800)
    expect(result.presupuestoDiario).toBe(650)
  })
})
