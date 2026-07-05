import {
  MAX_DESCRIPCION_LENGTH,
  MAX_MONTO,
  MAX_MSI_MESES,
  MIN_MSI_MESES,
} from '../../types/limits'

import { parseMontoValue } from '../format/montoInput'

export function validateMonto(value: string): string | null {
  const monto = parseMontoValue(value)
  if (!value.trim() || Number.isNaN(monto) || monto <= 0) {
    return 'Ingresa un monto válido mayor a 0.'
  }
  if (monto > MAX_MONTO) {
    return `El monto no puede superar ${MAX_MONTO.toLocaleString('es-MX')}.`
  }
  return null
}

export function validateDescripcion(value: string): string | null {
  const descripcion = value.trim()
  if (!descripcion) return 'La descripción es obligatoria.'
  if (descripcion.length > MAX_DESCRIPCION_LENGTH) {
    return `La descripción no puede superar ${MAX_DESCRIPCION_LENGTH} caracteres.`
  }
  return null
}

export function validateNombre(value: string, label = 'El nombre'): string | null {
  const nombre = value.trim()
  if (!nombre) return `${label} es obligatorio.`
  if (nombre.length > MAX_DESCRIPCION_LENGTH) {
    return `${label} no puede superar ${MAX_DESCRIPCION_LENGTH} caracteres.`
  }
  return null
}

export function validateCuentaId(value: string): string | null {
  if (!value.trim()) return 'Selecciona una cuenta o método de pago.'
  return null
}

export function validateMsiMeses(value: string): string | null {
  const meses = Number(value)
  if (!Number.isInteger(meses) || meses < MIN_MSI_MESES || meses > MAX_MSI_MESES) {
    return `Los meses sin intereses deben ser un número entre ${MIN_MSI_MESES} y ${MAX_MSI_MESES}.`
  }
  return null
}

export function validateDiaMes(value: string): string | null {
  const dia = Number(value)
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    return 'El día del mes debe estar entre 1 y 31.'
  }
  return null
}
