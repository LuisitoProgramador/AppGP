import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { PendingGasto } from '../types/gasto'

const { insertMock, getUserMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  getUserMock: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: getUserMock },
    from: () => ({ insert: insertMock }),
  },
}))

vi.mock('./cuentas', () => ({
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

function pendingGasto(id: string): PendingGasto {
  return {
    id,
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
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    insertMock.mockResolvedValue({ error: null })
    vi.mocked(removePendingGasto).mockResolvedValue(undefined)
  })

  it('sincroniza varios gastos en paralelo', async () => {
    vi.mocked(getPendingGastos).mockResolvedValue([
      pendingGasto('a'),
      pendingGasto('b'),
      pendingGasto('c'),
    ])

    const result = await syncPendingGastos()

    expect(result.synced).toBe(3)
    expect(insertMock).toHaveBeenCalledTimes(3)
    expect(removePendingGasto).toHaveBeenCalledTimes(3)
  })
})
