import type { MsiInstallmentUpdate } from '../../types/gasto'
import { moneyEquals } from '../core/centavos'

export interface MsiGrupoServerState {
  categoria: string
  cuentaId: string
  installments: MsiInstallmentUpdate[]
}

function normalizeFecha(fecha: string): string {
  return new Date(fecha).toISOString().slice(0, 10)
}

export function msiGrupoMatchesExpected(
  server: MsiGrupoServerState,
  expected: {
    categoria: string
    cuentaId: string
    installments: MsiInstallmentUpdate[]
  },
): boolean {
  if (server.categoria !== expected.categoria) return false
  if (server.cuentaId !== expected.cuentaId) return false
  if (server.installments.length !== expected.installments.length) return false

  return expected.installments.every((expectedRow, index) => {
    const serverRow = server.installments[index]
    if (!serverRow) return false
    if (!moneyEquals(Number(serverRow.monto), Number(expectedRow.monto))) {
      return false
    }
    if (serverRow.descripcion !== expectedRow.descripcion) return false
    return normalizeFecha(serverRow.fecha) === normalizeFecha(expectedRow.fecha)
  })
}
