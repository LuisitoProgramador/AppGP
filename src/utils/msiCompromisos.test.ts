import { describe, expect, it } from 'vitest'
import { calcularCompromisosMsi } from './msiCompromisos'

describe('calcularCompromisosMsi', () => {
  const desde = new Date(2026, 6, 15) // julio 2026

  it('agrupa mensualidades MSI por mes', () => {
    const result = calcularCompromisosMsi(
      [
        { monto: 500, fecha: new Date(2026, 6, 5).toISOString() },
        { monto: 500, fecha: new Date(2026, 7, 5).toISOString() },
        { monto: 500, fecha: new Date(2026, 8, 5).toISOString() },
      ],
      [],
      10000,
      desde,
    )

    expect(result).toHaveLength(3)
    expect(result[0].comprometido).toBe(500)
    expect(result[1].comprometido).toBe(500)
    expect(result[2].comprometido).toBe(500)
    expect(result[0].disponibleReal).toBe(9500)
  })

  it('incluye gastos optimistas MSI', () => {
    const result = calcularCompromisosMsi(
      [],
      [
        {
          tempId: '1',
          monto: 300,
          categoria: 'Comida',
          descripcion: 'Test MSI',
          fecha: new Date(2026, 6, 10).toISOString(),
          cuenta_id: 'c1',
          es_msi: true,
          grupo_msi_id: 'g1',
        },
      ],
      5000,
      desde,
    )

    expect(result[0].comprometido).toBe(300)
    expect(result[0].disponibleReal).toBe(4700)
  })
})
