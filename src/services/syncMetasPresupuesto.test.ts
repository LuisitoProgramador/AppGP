import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
const isOnlineMock = vi.fn(() => true)
const selectEqMock = vi.fn()
const updateChainMock = vi.fn()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
})

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => selectEqMock(),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: updateChainMock,
            }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('../utils/network', () => ({
  isOnline: () => isOnlineMock(),
  offlineServiceError: (msg: string) => ({ data: null, error: msg }),
}))

vi.mock('./presupuesto', () => ({
  getPresupuesto: vi.fn(),
}))

import { getPresupuesto } from './presupuesto'
import { syncMetasAnualesConPresupuesto } from './metasAhorro'
import { calcMetaObjetivoAnual } from '../utils/finanzas'

const USER_ID = 'user-sync-meta'

describe('syncMetasAnualesConPresupuesto', () => {
  beforeEach(() => {
    storage.clear()
    isOnlineMock.mockReturnValue(true)
    selectEqMock.mockReset()
    updateChainMock.mockReset()
    vi.mocked(getPresupuesto).mockReset()
  })

  it('actualiza la meta anual vigente al cambiar el presupuesto', async () => {
    const createdAt = '2026-03-23T12:00:00.000Z'
    const metaRow = {
      id: 1,
      nombre: 'Mi ahorro 2026',
      monto_objetivo: 10000,
      monto_actual: 500,
      fecha_limite: '2026-12-31',
      created_at: createdAt,
    }

    selectEqMock.mockResolvedValue({ data: [metaRow], error: null })

    const nuevoObjetivo = calcMetaObjetivoAnual(12000, 20, 500, new Date(createdAt))
    updateChainMock.mockResolvedValue({
      data: { ...metaRow, monto_objetivo: nuevoObjetivo },
      error: null,
    })

    storage.set(`metas_ahorro_${USER_ID}`, JSON.stringify([metaRow]))

    const updated = await syncMetasAnualesConPresupuesto(USER_ID, {
      sueldo_mensual: 12000,
      porcentaje_ahorro: 20,
      ingresos_extras: 500,
    })

    expect(updated).toBe(true)
    expect(updateChainMock).toHaveBeenCalledOnce()

    const cached = JSON.parse(storage.get(`metas_ahorro_${USER_ID}`) ?? '[]') as {
      monto_objetivo: number
    }[]
    expect(cached[0]?.monto_objetivo).toBe(nuevoObjetivo)
  })

  it('no toca metas personalizadas ni metas expiradas', async () => {
    selectEqMock.mockResolvedValue({
      data: [
        {
          id: 2,
          nombre: 'Vacaciones',
          monto_objetivo: 5000,
          monto_actual: 100,
          fecha_limite: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 3,
          nombre: 'Mi ahorro 2025',
          monto_objetivo: 20000,
          monto_actual: 20000,
          fecha_limite: '2025-12-31',
          created_at: '2025-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    })

    const updated = await syncMetasAnualesConPresupuesto(USER_ID, {
      sueldo_mensual: 10000,
      porcentaje_ahorro: 20,
      ingresos_extras: 0,
    })

    expect(updated).toBe(false)
    expect(updateChainMock).not.toHaveBeenCalled()
  })

  it('no hace nada offline', async () => {
    isOnlineMock.mockReturnValue(false)

    const updated = await syncMetasAnualesConPresupuesto(USER_ID, {
      sueldo_mensual: 10000,
      porcentaje_ahorro: 20,
    })

    expect(updated).toBe(false)
    expect(selectEqMock).not.toHaveBeenCalled()
  })
})
