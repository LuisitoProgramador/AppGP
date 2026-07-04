const STORAGE_KEY = 'app-modo-viaje'

export function isModoViaje(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setModoViaje(activo: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, activo ? '1' : '0')
  } catch {
    // ignore
  }
}

export function toggleModoViaje(): boolean {
  try {
    const current = sessionStorage.getItem(STORAGE_KEY) === '1'
    const next = !current
    sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    return next
  } catch {
    return false
  }
}
