const STORAGE_KEY = 'app-vista-quincenal'

export function isVistaQuincenal(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setVistaQuincenal(activo: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, activo ? '1' : '0')
  } catch {
    // ignore
  }
}
