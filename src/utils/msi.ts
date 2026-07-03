import { addMonths } from './date'
import type { MsiInstallmentUpdate } from '../types/gasto'

export interface GastoInsertPayload {
  monto: number
  categoria: string
  descripcion: string
  fecha: string
  cuenta_id: string | null
  es_msi: boolean
  grupo_msi_id: string | null
}

export function splitMsiAmount(total: number, months: number): number[] {
  const base = Math.floor((total / months) * 100) / 100
  const amounts = Array.from({ length: months }, () => base)
  const remainder = Math.round((total - base * months) * 100) / 100
  amounts[months - 1] = Math.round((amounts[months - 1] + remainder) * 100) / 100
  return amounts
}

export function buildMsiGastos(params: {
  totalMonto: number
  months: number
  categoria: string
  descripcion: string
  cuentaId: string
  startDate?: Date
  grupoMsiId?: string
}): GastoInsertPayload[] {
  const {
    totalMonto,
    months,
    categoria,
    descripcion,
    cuentaId,
    startDate = new Date(),
    grupoMsiId = crypto.randomUUID(),
  } = params

  const amounts = splitMsiAmount(totalMonto, months)
  const trimmedDesc = descripcion.trim()

  return amounts.map((monto, index) => ({
    monto,
    categoria,
    descripcion: `${trimmedDesc} (MSI ${index + 1}/${months})`,
    fecha: addMonths(startDate, index).toISOString(),
    cuenta_id: cuentaId,
    es_msi: true,
    grupo_msi_id: grupoMsiId,
  }))
}

export function buildSingleGasto(params: {
  monto: number
  categoria: string
  descripcion: string
  cuentaId: string | null
  fecha?: string
}): GastoInsertPayload {
  return {
    monto: params.monto,
    categoria: params.categoria,
    descripcion: params.descripcion.trim(),
    fecha: params.fecha ?? new Date().toISOString(),
    cuenta_id: params.cuentaId,
    es_msi: false,
    grupo_msi_id: null,
  }
}

export function parseMsiDescripcion(descripcion: string): {
  base: string
  index: number
  total: number
} | null {
  const match = descripcion.trim().match(/^(.+?) \(MSI (\d+)\/(\d+)\)$/)
  if (!match) return null

  const index = Number(match[2])
  const total = Number(match[3])
  if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1) {
    return null
  }

  return { base: match[1], index, total }
}

export function toMsiInstallmentUpdates(
  rows: GastoInsertPayload[],
): MsiInstallmentUpdate[] {
  return rows.map((row) => ({
    monto: row.monto,
    descripcion: row.descripcion,
    fecha: row.fecha,
  }))
}
