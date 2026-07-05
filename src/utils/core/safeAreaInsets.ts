const STANDALONE_BOTTOM_FLOOR_PX = 34

function isStandalonePwa(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function floorInset(value: string, minPx: number): string {
  const parsed = parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < minPx) return `${minPx}px`
  return value
}

/** Mide env(safe-area-inset-*) y los expone como CSS vars (iOS PWA tarda en aplicarlos al primer paint). */
export function applySafeAreaInsets(): void {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;top:0;left:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;pointer-events:none;'
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)

  const bottomRaw = style.paddingBottom
  const bottom =
    isStandalonePwa() ? floorInset(bottomRaw, STANDALONE_BOTTOM_FLOOR_PX) : bottomRaw

  document.documentElement.style.setProperty('--safe-area-top', style.paddingTop)
  document.documentElement.style.setProperty('--safe-area-right', style.paddingRight)
  document.documentElement.style.setProperty('--safe-area-bottom', bottom)
  document.documentElement.style.setProperty('--safe-area-left', style.paddingLeft)
  document.body.removeChild(probe)
}

export function installSafeAreaInsetListeners(): () => void {
  const refresh = (): void => {
    applySafeAreaInsets()
  }

  refresh()
  requestAnimationFrame(refresh)
  requestAnimationFrame(() => requestAnimationFrame(refresh))

  window.addEventListener('resize', refresh)
  window.addEventListener('orientationchange', refresh)
  window.visualViewport?.addEventListener('resize', refresh)

  return () => {
    window.removeEventListener('resize', refresh)
    window.removeEventListener('orientationchange', refresh)
    window.visualViewport?.removeEventListener('resize', refresh)
  }
}
