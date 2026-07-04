import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
})

const maybeSingleMock = vi.fn()
const upsertMock = vi.fn()

vi.mock('./supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      upsert: upsertMock,
    })),
  },
}))

vi.mock('./metasAhorro', () => ({
  syncMetasAnualesConPresupuesto: vi.fn().mockResolvedValue(false),
}))

import { savePresupuestoFinanciero } from './presupuesto'
import { syncMetasAnualesConPresupuesto } from './metasAhorro'

const userId = '00000000-0000-4000-8000-000000000001'

function presupuestoRow(overrides: Record<string, unknown> = {}) {
  return {
    limite_mensual: 8000,
    limite_es_manual: false,
    sueldo_mensual: 10000,
    ingresos_extras: 0,
    sueldo_semanal: 2309.47,
    dia_pago: 5,
    porcentaje_ahorro: 20,
    ...overrides,
  }
}

describe('savePresupuestoFinanciero', () => {
  beforeEach(() => {
    storage.clear()
    maybeSingleMock.mockReset()
    upsertMock.mockReset()
    upsertMock.mockResolvedValue({ error: null })
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
  })

  it('guarda estrategia y aplica límite calculado cuando no es manual', async () => {
    maybeSingleMock.mockResolvedValue({
      data: presupuestoRow({ limite_es_manual: false, limite_mensual: 7000 }),
      error: null,
    })

    const result = await savePresupuestoFinanciero(userId, {
      sueldo_mensual: 10000,
      ingresos_extras: 0,
      porcentaje_ahorro: 20,
      dia_pago: 5,
    })

    expect(result.error).toBeNull()
    expect(result.limiteManualPreservado).toBe(false)
    expect(result.presupuesto?.limite_mensual).toBe(8000)
    expect(result.presupuesto?.limite_es_manual).toBe(false)
    expect(upsertMock).toHaveBeenCalledOnce()

    const upsertRow = upsertMock.mock.calls[0][0] as Record<string, unknown>
    expect(upsertRow.limite_mensual).toBe(8000)
    expect(upsertRow.limite_es_manual).toBe(false)
    expect(upsertRow.sueldo_mensual).toBe(10000)
    expect(syncMetasAnualesConPresupuesto).toHaveBeenCalledOnce()
  })

  it('preserva límite manual al actualizar estrategia', async () => {
    maybeSingleMock.mockResolvedValue({
      data: presupuestoRow({ limite_es_manual: true, limite_mensual: 7500 }),
      error: null,
    })

    const result = await savePresupuestoFinanciero(userId, {
      sueldo_mensual: 12000,
      ingresos_extras: 0,
      porcentaje_ahorro: 20,
      dia_pago: 5,
    })

    expect(result.error).toBeNull()
    expect(result.limiteManualPreservado).toBe(true)
    expect(result.presupuesto?.limite_mensual).toBe(7500)
    expect(result.presupuesto?.limite_es_manual).toBe(true)

    const upsertRow = upsertMock.mock.calls[0][0] as Record<string, unknown>
    expect(upsertRow.limite_mensual).toBe(7500)
    expect(upsertRow.limite_es_manual).toBe(true)
    expect(upsertRow.sueldo_mensual).toBe(12000)
  })

  it('rechaza porcentaje de ahorro fuera del rango de la UI', async () => {
    const result = await savePresupuestoFinanciero(userId, {
      sueldo_mensual: 10000,
      ingresos_extras: 0,
      porcentaje_ahorro: 12,
      dia_pago: 5,
    })

    expect(result.error).toContain('múltiplo')
    expect(result.presupuesto).toBeNull()
    expect(upsertMock).not.toHaveBeenCalled()
  })
})
