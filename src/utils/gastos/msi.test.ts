import { describe, expect, it } from 'vitest'
import { buildMsiGastos, parseMsiDescripcion, splitMsiAmount, toMsiInstallmentUpdates } from './msi'

describe('splitMsiAmount', () => {
  it('divide el monto en partes iguales con ajuste en el último pago', () => {
    const parts = splitMsiAmount(1000, 3)
    expect(parts).toHaveLength(3)
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 2)
  })
})

describe('buildMsiGastos', () => {
  it('genera N gastos con grupo_msi_id compartido y fechas mensuales', () => {
    const grupoMsiId = 'test-grupo-uuid'
    const start = new Date(2026, 0, 15)
    const rows = buildMsiGastos({
      totalMonto: 1200,
      months: 3,
      categoria: 'Otros',
      descripcion: 'Laptop',
      cuentaId: '11111111-1111-1111-1111-111111111111',
      startDate: start,
      grupoMsiId,
    })

    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.grupo_msi_id === grupoMsiId)).toBe(true)
    expect(rows.every((r) => r.es_msi)).toBe(true)
    expect(rows[0].descripcion).toContain('MSI 1/3')
    expect(new Date(rows[1].fecha).getMonth()).toBe(1)
    expect(rows[0].fecha).toMatch(/T12:00:00-06:00$/)
  })
})

describe('parseMsiDescripcion', () => {
  it('extrae base, índice y total de la descripción MSI', () => {
    expect(parseMsiDescripcion('Laptop (MSI 2/12)')).toEqual({
      base: 'Laptop',
      index: 2,
      total: 12,
    })
    expect(parseMsiDescripcion('Sin formato')).toBeNull()
  })
})

describe('toMsiInstallmentUpdates', () => {
  it('convierte filas MSI a payload de actualización', () => {
    const rows = buildMsiGastos({
      totalMonto: 600,
      months: 3,
      categoria: 'Otros',
      descripcion: 'TV',
      cuentaId: '11111111-1111-1111-1111-111111111111',
    })

    const updates = toMsiInstallmentUpdates(rows)
    expect(updates).toHaveLength(3)
    expect(updates[0]).toMatchObject({
      monto: expect.any(Number),
      descripcion: expect.stringContaining('MSI 1/3'),
      fecha: expect.any(String),
    })
  })
})
