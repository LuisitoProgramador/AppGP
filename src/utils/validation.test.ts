import { describe, expect, it } from 'vitest'
import { validateDescripcion, validateDiaMes, validateMonto, validateMsiMeses, validateNombre } from './validation'

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

  it('valida meses MSI', () => {
    expect(validateMsiMeses('3')).toBeNull()
    expect(validateMsiMeses('1')).not.toBeNull()
    expect(validateMsiMeses('49')).not.toBeNull()
  })

  it('valida día del mes', () => {
    expect(validateDiaMes('15')).toBeNull()
    expect(validateDiaMes('0')).not.toBeNull()
    expect(validateDiaMes('32')).not.toBeNull()
  })

  it('valida nombres', () => {
    expect(validateNombre('Vacaciones')).toBeNull()
    expect(validateNombre('   ')).not.toBeNull()
  })
})
