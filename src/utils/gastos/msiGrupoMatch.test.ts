import { describe, expect, it } from 'vitest'
import { msiGrupoMatchesExpected } from './msiGrupoMatch'

describe('msiGrupoMatchesExpected', () => {
  const expected = {
    categoria: 'Comida',
    cuentaId: 'cuenta-1',
    installments: [
      { monto: 100, descripcion: 'Compra (MSI 1/2)', fecha: '2026-01-15T00:00:00.000Z' },
      { monto: 100, descripcion: 'Compra (MSI 2/2)', fecha: '2026-02-15T00:00:00.000Z' },
    ],
  }

  it('coincide cuando el servidor refleja las cuotas esperadas', () => {
    expect(
      msiGrupoMatchesExpected(
        {
          categoria: 'Comida',
          cuentaId: 'cuenta-1',
          installments: [
            {
              monto: 100,
              descripcion: 'Compra (MSI 1/2)',
              fecha: '2026-01-15T12:00:00.000Z',
            },
            {
              monto: 100,
              descripcion: 'Compra (MSI 2/2)',
              fecha: '2026-02-15T18:30:00.000Z',
            },
          ],
        },
        expected,
      ),
    ).toBe(true)
  })

  it('no coincide si cambia la cuenta', () => {
    expect(
      msiGrupoMatchesExpected(
        {
          categoria: 'Comida',
          cuentaId: 'cuenta-2',
          installments: expected.installments,
        },
        expected,
      ),
    ).toBe(false)
  })

  it('no coincide si cambia el número de cuotas', () => {
    expect(
      msiGrupoMatchesExpected(
        {
          categoria: 'Comida',
          cuentaId: 'cuenta-1',
          installments: [expected.installments[0]],
        },
        expected,
      ),
    ).toBe(false)
  })

  it('no coincide si cambia un monto', () => {
    expect(
      msiGrupoMatchesExpected(
        {
          categoria: 'Comida',
          cuentaId: 'cuenta-1',
          installments: [
            { ...expected.installments[0], monto: 99.99 },
            expected.installments[1],
          ],
        },
        expected,
      ),
    ).toBe(false)
  })

  it('coincide con tolerancia cuando el servidor tiene más decimales', () => {
    expect(
      msiGrupoMatchesExpected(
        {
          categoria: 'Comida',
          cuentaId: 'cuenta-1',
          installments: [
            { ...expected.installments[0], monto: 100.0004 },
            { ...expected.installments[1], monto: 99.9996 },
          ],
        },
        expected,
      ),
    ).toBe(true)
  })
})
