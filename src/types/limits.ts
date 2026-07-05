/**
 * Límites de validación compartidos entre cliente y Postgres.
 * Mantener alineados con supabase/monto_max_check.sql
 */
export const MAX_MONTO = 1_000_000 as const

export const MAX_DESCRIPCION_LENGTH = 200 as const

export const MIN_MSI_MESES = 2 as const

export const MAX_MSI_MESES = 48 as const
