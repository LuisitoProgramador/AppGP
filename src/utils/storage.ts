export function readSessionStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSessionStorage(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Storage bloqueado o cuota agotada — la app sigue funcionando sin persistir.
  }
}

export function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
