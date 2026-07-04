import { describe, expect, it, vi, beforeEach } from 'vitest'

const storage = new Map<string, string>()
const isOnlineMock = vi.fn(() => false)

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
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: 'Meta no encontrada' } }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../utils/network', () => ({
  isOnline: () => isOnlineMock(),
  offlineServiceError: (msg: string) => ({ data: null, error: msg }),
}))

import { addAhorroToMeta, syncPendingMetaAhorro } from './metasAhorro'

const USER_ID = 'user-meta-test'

describe('metasAhorro offline', () => {
  beforeEach(() => {
    storage.clear()
    isOnlineMock.mockReturnValue(false)
    storage.set(
      `metas_ahorro_${USER_ID}`,
      JSON.stringify([
        {
          id: 1,
          nombre: 'Vacaciones',
          monto_objetivo: 5000,
          monto_actual: 100,
          fecha_limite: null,
        },
      ]),
    )
  })

  it('acumula aportes offline leyendo siempre el cache más reciente', async () => {
    await addAhorroToMeta(USER_ID, 1, 50)
    await addAhorroToMeta(USER_ID, 1, 75)

    const cached = JSON.parse(storage.get(`metas_ahorro_${USER_ID}`) ?? '[]') as {
      monto_actual: number
    }[]
    expect(cached[0]?.monto_actual).toBe(225)

    const pending = JSON.parse(storage.get(`metas_ahorro_pending_${USER_ID}`) ?? '[]') as {
      amount: number
    }[]
    expect(pending).toHaveLength(2)
    expect(pending.reduce((sum, item) => sum + item.amount, 0)).toBe(125)
  })

  it('conserva aportes pendientes tras reintentos fallidos', async () => {
    storage.set(
      `metas_ahorro_${USER_ID}`,
      JSON.stringify([
        {
          id: 1,
          nombre: 'Vacaciones',
          monto_objetivo: 5000,
          monto_actual: 300,
          fecha_limite: null,
        },
      ]),
    )
    storage.set(
      `metas_ahorro_pending_${USER_ID}`,
      JSON.stringify([
        { id: 'p1', metaId: 1, amount: 200, createdAt: Date.now(), retryCount: 2 },
      ]),
    )

    isOnlineMock.mockReturnValue(true)
    await syncPendingMetaAhorro(USER_ID)

    const cached = JSON.parse(storage.get(`metas_ahorro_${USER_ID}`) ?? '[]') as {
      monto_actual: number
    }[]
    expect(cached[0]?.monto_actual).toBe(300)
    expect(JSON.parse(storage.get(`metas_ahorro_pending_${USER_ID}`) ?? '[]')).toHaveLength(1)
  })
})
