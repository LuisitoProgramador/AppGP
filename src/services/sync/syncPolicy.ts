export const MAX_SYNC_RETRIES = 8

const PERMANENT_ERROR_PATTERNS = [
  'row-level security',
  'violates row-level security',
  'foreign key',
  'violates foreign key',
  'duplicate key',
  'unique constraint',
  'check constraint',
  'violates check',
  'not-null constraint',
  'null value in column',
  'invalid input',
  'invalid uuid',
  'grupo msi',
  'syntax error',
  'column does not exist',
  'permission denied',
  '42501',
  '23503',
  '23505',
  '23514',
  '22p02',
  '42804',
] as const

/** Errores que no se resuelven reintentando (RLS, FK, validación, duplicados). */
export function isPermanentSyncError(error: string): boolean {
  const lower = error.toLowerCase()
  return PERMANENT_ERROR_PATTERNS.some((pattern) => lower.includes(pattern))
}

/** Descarta tras error permanente o al superar el máximo de reintentos transitorios. */
export function shouldDiscardAfterRetry(retryCount: number, error?: string): boolean {
  if (error && isPermanentSyncError(error)) return true
  return retryCount >= MAX_SYNC_RETRIES
}
