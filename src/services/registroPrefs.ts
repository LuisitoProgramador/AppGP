import type { Categoria } from '../types/gasto'

export interface RegistroPrefs {
  modoRapido: boolean
  ultimaCategoria: Categoria | null
  ultimaCuentaId: string | null
}

const DEFAULT_PREFS: RegistroPrefs = {
  modoRapido: true,
  ultimaCategoria: null,
  ultimaCuentaId: null,
}

function storageKey(userId: string) {
  return `registro_prefs_${userId}`
}

export function getRegistroPrefs(userId: string): RegistroPrefs {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) } as RegistroPrefs
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function saveRegistroPrefs(userId: string, patch: Partial<RegistroPrefs>): RegistroPrefs {
  const next = { ...getRegistroPrefs(userId), ...patch }
  localStorage.setItem(storageKey(userId), JSON.stringify(next))
  return next
}

export function recordUltimoRegistro(
  userId: string,
  categoria: Categoria,
  cuentaId: string,
): void {
  saveRegistroPrefs(userId, { ultimaCategoria: categoria, ultimaCuentaId: cuentaId })
}
