import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cuenta } from '../../types/cuenta'

const mockUpdate = vi.fn()
const mockFrom = vi.fn()

vi.mock('../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockReadLegacy = vi.fn()
const mockClearLegacy = vi.fn()
const mockNormalize = vi.fn()

vi.mock('../cuentaInteres', () => ({
  readLegacyTasaInteresMensual: (...args: unknown[]) => mockReadLegacy(...args),
  clearLegacyTasaInteresMensual: (...args: unknown[]) => mockClearLegacy(...args),
  normalizeTasaInteresMensual: (...args: unknown[]) => mockNormalize(...args),
}))

import { migrateLegacyTasaInteres } from './migrateTasaInteres'

function cuentaCredito(id: string, tasa: number | null = null): Cuenta {
  return {
    id,
    user_id: 'user-1',
    nombre: 'Tarjeta',
    tipo: 'credito',
    saldo_actual: 0,
    limite_credito: 10000,
    tasa_interes_mensual: tasa,
    dia_corte: 1,
    dia_pago: 15,
    es_default: false,
    created_at: '',
  }
}

describe('migrateLegacyTasaInteres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ update: mockUpdate })
    mockNormalize.mockImplementation((value: number | null | undefined) =>
      value == null || value <= 0 ? null : value,
    )
  })

  it('migra y limpia localStorage cuando Supabase confirma el valor', async () => {
    mockReadLegacy.mockReturnValue(3.5)
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { tasa_interes_mensual: 3.5 },
        error: null,
      }),
    })

    const result = await migrateLegacyTasaInteres('user-1', [cuentaCredito('c1')])

    expect(mockClearLegacy).toHaveBeenCalledWith('c1')
    expect(result[0].tasa_interes_mensual).toBe(3.5)
  })

  it('conserva localStorage si Supabase devuelve error', async () => {
    mockReadLegacy.mockReturnValue(2.1)
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'network' },
      }),
    })

    const result = await migrateLegacyTasaInteres('user-1', [cuentaCredito('c1')])

    expect(mockClearLegacy).not.toHaveBeenCalled()
    expect(result[0].tasa_interes_mensual).toBeNull()
  })

  it('conserva localStorage si el valor persistido no coincide', async () => {
    mockReadLegacy.mockReturnValue(2.5)
    mockNormalize.mockImplementation((value: number | null | undefined) => value ?? null)
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { tasa_interes_mensual: 2.4 },
        error: null,
      }),
    })

    await migrateLegacyTasaInteres('user-1', [cuentaCredito('c1')])

    expect(mockClearLegacy).not.toHaveBeenCalled()
  })

  it('conserva localStorage ante excepción de red', async () => {
    mockReadLegacy.mockReturnValue(1.9)
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockRejectedValue(new Error('timeout')),
    })

    await migrateLegacyTasaInteres('user-1', [cuentaCredito('c1')])

    expect(mockClearLegacy).not.toHaveBeenCalled()
  })
})
