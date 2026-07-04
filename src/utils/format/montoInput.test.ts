import { describe, expect, it } from 'vitest'
import { formatMontoFromNumber, formatMontoInput, parseMontoValue } from './montoInput'

describe('montoInput', () => {
  it('formatea miles mientras se escribe', () => {
    expect(formatMontoInput('10000')).toBe('10,000')
    expect(formatMontoInput('25000')).toBe('25,000')
    expect(formatMontoInput('1000000')).toBe('1,000,000')
  })

  it('permite decimales', () => {
    expect(formatMontoInput('10000.5')).toBe('10,000.5')
    expect(formatMontoInput('10000.567')).toBe('10,000.56')
  })

  it('parsea texto con comas', () => {
    expect(parseMontoValue('10,000')).toBe(10000)
    expect(parseMontoValue('25,000.50')).toBe(25000.5)
  })

  it('formatea desde número', () => {
    expect(formatMontoFromNumber(10000)).toBe('10,000')
    expect(formatMontoFromNumber(25000.5)).toBe('25,000.5')
  })
})
