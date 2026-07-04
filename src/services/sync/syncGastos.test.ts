import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { PendingGasto } from '../../types/gasto'

const { insertMock, getUserMock, countMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  getUserMock: vi.fn(),
  countMock: vi.fn(),
}))

vi.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: getUserMock },
    from: () => ({
      insert: insertMock,
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({ ...countMock() }),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('../cuentas', () => ({
  getCachedCuentas: vi.fn(() => []),
  persistCuentaSaldo: vi.fn(async () => ({ error: null })),
  revertGastoSaldoLocal: vi.fn((_userId, cuentas) => cuentas),
}))

vi.mock('./offlineQueue', () => ({
  getPendingGastos: vi.fn(),
  removePendingGasto: vi.fn(),
  updatePendingGasto: vi.fn(),
}))

import { getPendingGastos, removePendingGasto } from './offlineQueue'
import { syncPendingGastos } from './syncGastos'

const USER_ID = 'user-1'

function pendingGasto(id: string): PendingGasto {
  return {
    id,
    userId: USER_ID,
    monto: 100,
    categoria: 'Comida',
    descripcion: `Gasto ${id}`,
    fecha: '2026-07-04',
    cuenta_id: 'cuenta-1',
    createdAt: Date.now(),
    retryCount: 0,
  }
}

describe('syncPendingGastos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    countMock.mockReturnValue({ count: 0, error: null })
    insertMock.mockResolvedValue({ error: null })
    vi.mocked(removePendingGasto).mockResolvedValue(undefined)
  })

  it('sincroniza varios gastos en paralelo', async () => {
    vi.mocked(getPendingGastos).mockResolvedValue([
      pendingGasto('a'),
      pendingGasto('b'),
      pendingGasto('c'),
    ])

    const result = await syncPendingGastos(USER_ID)

    expect(result.synced).toBe(3)
    expect(getPendingGastos).toHaveBeenCalledWith(USER_ID)
    expect(insertMock).toHaveBeenCalledTimes(3)
    expect(removePendingGasto).toHaveBeenCalledTimes(3)
  })
})
