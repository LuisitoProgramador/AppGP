interface RegistroPrefs {
  ultimaCuentaId: string | null
}

const DEFAULT_PREFS: RegistroPrefs = {
  ultimaCuentaId: null,
}

function storageKey(userId: string) {
  return `registro_prefs_${userId}`
}

function getRegistroPrefs(userId: string): RegistroPrefs {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) } as RegistroPrefs
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function saveRegistroPrefs(userId: string, patch: Partial<RegistroPrefs>): RegistroPrefs {
  const next = { ...getRegistroPrefs(userId), ...patch }
  localStorage.setItem(storageKey(userId), JSON.stringify(next))
  return next
}

export function recordUltimoRegistro(userId: string, cuentaId: string): void {
  saveRegistroPrefs(userId, { ultimaCuentaId: cuentaId })
}
