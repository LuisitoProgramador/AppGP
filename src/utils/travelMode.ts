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
  const next = !isModoViaje()
  setModoViaje(next)
  return next
}
