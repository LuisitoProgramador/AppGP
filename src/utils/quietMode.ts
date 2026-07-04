const STORAGE_KEY = 'app-modo-tranquilo'

export function isModoTranquilo(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setModoTranquilo(activo: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, activo ? '1' : '0')
  } catch {
    // ignore
  }
}
