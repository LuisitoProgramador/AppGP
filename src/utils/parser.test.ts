import { describe, expect, it } from 'vitest'
import { parseGastoInput } from './parser'

describe('parseGastoInput', () => {
  it('parsea monto al inicio con descripción', () => {
    expect(parseGastoInput('150 tacos')).toEqual({
      monto: 150,
      categoria: 'Comida',
      descripcion: 'tacos',
    })
  })

  it('parsea monto al final con keyword de transporte', () => {
    expect(parseGastoInput('85 uber')).toEqual({
      monto: 85,
      categoria: 'Transporte',
      descripcion: 'uber',
    })
  })

  it('detecta suscripciones', () => {
    expect(parseGastoInput('199 netflix')).toEqual({
      monto: 199,
      categoria: 'Suscripciones',
      descripcion: 'netflix',
    })
  })

  it('usa Otros cuando no hay keyword', () => {
    expect(parseGastoInput('50 regalo')).toEqual({
      monto: 50,
      categoria: 'Otros',
      descripcion: 'regalo',
    })
  })

  it('retorna null si no hay monto', () => {
    expect(parseGastoInput('solo texto')).toBeNull()
  })
})
