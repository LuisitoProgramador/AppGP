import { describe, expect, it } from 'vitest'
import { resolveLimiteMensual, type PresupuestoLimiteInput } from '../utils/resolveLimiteMensual'

function basePresupuesto(overrides: Partial<PresupuestoLimiteInput> = {}): PresupuestoLimiteInput {
  return {
    limite_mensual: 8000,
    limite_es_manual: false,
    sueldo_mensual: 10000,
    ingresos_extras: 0,
    porcentaje_ahorro: 20,
    ...overrides,
  }
}

describe('resolveLimiteMensual', () => {
  it('usa limite_mensual cuando limite_es_manual es true', () => {
    expect(
      resolveLimiteMensual(
        basePresupuesto({ limite_mensual: 7500, limite_es_manual: true }),
      ),
    ).toBe(7500)
  })

  it('deriva de estrategia cuando limite_es_manual es false', () => {
    expect(resolveLimiteMensual(basePresupuesto())).toBe(8000)
  })

  it('usa limite_mensual sin estrategia completa', () => {
    expect(
      resolveLimiteMensual(
        basePresupuesto({
          limite_mensual: 6000,
          sueldo_mensual: null,
          porcentaje_ahorro: null,
        }),
      ),
    ).toBe(6000)
  })
})
