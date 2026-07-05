export const MAX_SYNC_RETRIES = 8

/** Errores que no se resuelven reintentando (RLS, FK, validación, duplicados). */
export function isPermanentSyncError(error: string): boolean {
  const lower = error.toLowerCase()

  if (lower.includes('row-level security') || lower.includes('violates row-level security')) {
    return true
  }
  if (lower.includes('foreign key') || lower.includes('violates foreign key')) {
    return true
  }
  if (lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return true
  }
  if (lower.includes('check constraint') || lower.includes('violates check')) {
    return true
  }
  if (lower.includes('not-null constraint') || lower.includes('null value in column')) {
    return true
  }
  if (lower.includes('invalid input') || lower.includes('invalid uuid')) {
    return true
  }
  if (lower.includes('grupo msi')) {
    return true
  }

  return false
}

/** Descarta tras error permanente o al superar el máximo de reintentos transitorios. */
export function shouldDiscardAfterRetry(retryCount: number, error?: string): boolean {
  if (error && isPermanentSyncError(error)) return true
  return retryCount >= MAX_SYNC_RETRIES
}
