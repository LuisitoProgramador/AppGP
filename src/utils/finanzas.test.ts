import { describe, expect, it } from 'vitest'
import {
  calcDiferenciaAhorroMensual,
  calcEstrategiaFinanciera,
  calcMetaObjetivoAnual,
  calcPrimerAhorro,
  SEMANAS_POR_MES,
} from './finanzas'

describe('calcEstrategiaFinanciera', () => {
  it('calcula ingreso total, ahorro y disponible para gasto', () => {
    const result = calcEstrategiaFinanciera({
      sueldoMensual: 10000,
      ingresosExtras: 2000,
      porcentajeAhorro: 15,
    })

    expect(result.presupuestoTotalMensual).toBe(12000)
    expect(result.ahorroMensual).toBe(1800)
    expect(result.disponibleParaGasto).toBe(10200)
    expect(result.sueldoSemanal).toBe(2309.47)
  })
})

describe('calcPrimerAhorro', () => {
  it('usa ingreso total mensual (sueldo + extras) como base', () => {
    const estrategia = calcEstrategiaFinanciera({
      sueldoMensual: 10000,
      ingresosExtras: 2000,
      porcentajeAhorro: 20,
    })
    const semanal = calcPrimerAhorro(10000, 20, 2000)

    expect(estrategia.ahorroMensual).toBe(2400)
    expect(semanal).toBe(Math.round((2400 / SEMANAS_POR_MES) * 100) / 100)
  })

  it('sin extras coincide con sueldo semanal × porcentaje', () => {
    expect(calcPrimerAhorro(10000, 20)).toBe(461.89)
  })
})

describe('calcMetaObjetivoAnual', () => {
  it('usa semanas restantes hasta 31 dic × ahorro semanal', () => {
    const sueldo = 10000
    const pct = 20
    const enero = calcMetaObjetivoAnual(sueldo, pct, 0, new Date(2026, 0, 1))
    const marzo23 = calcMetaObjetivoAnual(sueldo, pct, 0, new Date(2026, 2, 23))

    expect(enero).toBe(Math.round(461.89 * 53 * 100) / 100)
    expect(marzo23).toBe(Math.round(461.89 * 41 * 100) / 100)
    expect(marzo23).toBeLessThan(enero)
  })
})

describe('calcDiferenciaAhorroMensual', () => {
  it('mide el cambio de ahorro mensual al subir el porcentaje', () => {
    const diff = calcDiferenciaAhorroMensual(
      { sueldoMensual: 10000, ingresosExtras: 0, porcentajeAhorro: 10 },
      { sueldoMensual: 10000, ingresosExtras: 0, porcentajeAhorro: 20 },
    )

    expect(diff).toBe(1000)
  })
})
