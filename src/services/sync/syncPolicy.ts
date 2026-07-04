/** Nunca descarta pendientes: el usuario debe resolver manualmente. */
export function shouldDiscardAfterRetry(_retryCount: number): boolean {
  return false
}
