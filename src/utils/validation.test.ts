import { describe, expect, it } from 'vitest'
import { validateDescripcion, validateMonto } from './validation'

describe('validation utils', () => {
  it('valida montos positivos', () => {
    expect(validateMonto('150')).toBeNull()
    expect(validateMonto('0')).not.toBeNull()
    expect(validateMonto('abc')).not.toBeNull()
  })

  it('valida descripciones', () => {
    expect(validateDescripcion('Supermercado')).toBeNull()
    expect(validateDescripcion('   ')).not.toBeNull()
    expect(validateDescripcion('x'.repeat(201))).not.toBeNull()
  })
})
