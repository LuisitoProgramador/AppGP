const STORAGE_KEY = 'pulso_last_visit'
const ABSENCE_DAYS = 3

export interface WelcomeBackState {
  show: boolean
  diasAusente: number
}

export function markAppVisit(): void {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString())
}

export function getWelcomeBackState(now = new Date()): WelcomeBackState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { show: false, diasAusente: 0 }

    const last = new Date(raw)
    const ms = now.getTime() - last.getTime()
    const dias = Math.floor(ms / (24 * 60 * 60 * 1000))

    if (dias >= ABSENCE_DAYS) {
      return { show: true, diasAusente: dias }
    }

    return { show: false, diasAusente: dias }
  } catch {
    return { show: false, diasAusente: 0 }
  }
}

export function dismissWelcomeBack(): void {
  markAppVisit()
}

export function navigateToTab(tab: 'registro' | 'resumen' | 'historial' | 'plan'): void {
  window.dispatchEvent(new CustomEvent('pulso-navigate', { detail: tab }))
}
