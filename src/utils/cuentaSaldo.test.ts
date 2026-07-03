import { describe, expect, it } from 'vitest'
import {
  calcSaldoAfterGasto,
  montoParaSaldoCuenta,
  revertSaldoAfterGasto,
} from './cuentaSaldo'

describe('cuentaSaldo', () => {
  it('resta del saldo en efectivo y débito', () => {
    expect(calcSaldoAfterGasto('efectivo', 1000, 150)).toBe(850)
    expect(calcSaldoAfterGasto('debito', 500, 200)).toBe(300)
  })

  it('suma deuda en crédito', () => {
    expect(calcSaldoAfterGasto('credito', 1000, 250)).toBe(1250)
  })

  it('revierte el movimiento correctamente', () => {
    expect(revertSaldoAfterGasto('efectivo', 850, 150)).toBe(1000)
    expect(revertSaldoAfterGasto('credito', 1250, 250)).toBe(1000)
  })

  it('usa el total MSI para el saldo de crédito', () => {
    expect(montoParaSaldoCuenta(100, true, 1200)).toBe(1200)
    expect(montoParaSaldoCuenta(100, false)).toBe(100)
  })
})
