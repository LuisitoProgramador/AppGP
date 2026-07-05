import { describe, expect, it } from 'vitest'
import { fromCentavos, moneyEquals, roundMoney, sumMoney, toCentavos } from './centavos'

describe('centavos', () => {
  it('roundMoney redondea a 2 decimales vía centavos enteros', () => {
    expect(roundMoney(2.675)).toBe(2.68)
    expect(roundMoney(10.1 + 10.2)).toBe(20.3)
  })

  it('sumMoney acumula en centavos enteros', () => {
    expect(sumMoney(0.1, 0.2)).toBe(0.3)
    expect(sumMoney(333.33, 333.33, 333.34)).toBe(1000)
  })

  it('moneyEquals tolera diferencias menores a epsilon', () => {
    expect(moneyEquals(100, 100.0005)).toBe(true)
    expect(moneyEquals(100, 100.002)).toBe(false)
  })

  it('toCentavos y fromCentavos son inversos para montos válidos', () => {
    expect(fromCentavos(toCentavos(123.45))).toBe(123.45)
  })
})
