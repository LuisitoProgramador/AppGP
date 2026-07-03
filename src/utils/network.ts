export const OFFLINE_ERROR = 'Sin conexión'

export class OfflineError extends Error {
  constructor(message = OFFLINE_ERROR) {
    super(message)
    this.name = 'OfflineError'
  }
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

export function requireOnline(message?: string): void {
  if (!isOnline()) {
    throw new OfflineError(message)
  }
}

export function offlineServiceError<T = null>(
  message = 'Sin conexión. Conéctate para continuar.',
  data: T | null = null,
): { data: T | null; error: string } {
  return { data, error: message }
}
