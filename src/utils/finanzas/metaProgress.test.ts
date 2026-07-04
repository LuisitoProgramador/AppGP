import { describe, expect, it } from 'vitest'
import type { MetaAhorro } from '../../types/metaAhorro'
import { getMetaProgress } from '../finanzas/metaProgress'

describe('getMetaProgress', () => {
  const baseMeta: MetaAhorro = {
    id: 1,
    nombre: 'Vacaciones',
    monto_objetivo: 1000,
    monto_actual: 0,
    fecha_limite: null,
  }

  it('calcula el porcentaje de progreso', () => {
    expect(getMetaProgress({ ...baseMeta, monto_actual: 250 })).toBe(25)
    expect(getMetaProgress({ ...baseMeta, monto_actual: 1000 })).toBe(100)
  })

  it('no supera el 100%', () => {
    expect(getMetaProgress({ ...baseMeta, monto_actual: 1500 })).toBe(100)
  })
})
