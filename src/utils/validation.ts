import { MAX_DESCRIPCION_LENGTH, MAX_MONTO } from '../types/gasto'

export function validateMonto(value: string): string | null {
  const monto = Number(value)
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
