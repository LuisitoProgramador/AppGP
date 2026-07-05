const STANDALONE_BOTTOM_PX = 34

function isStandalonePwa(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function floorPx(value: string, minPx: number): string {
  const n = parseFloat(value)
  if (!Number.isFinite(n) || n < minPx) return `${minPx}px`
  return value
}

/** Mide env(safe-area-inset-*) y los expone como CSS vars. */
export function applySafeAreaInsets(): void {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;pointer-events:none;'
  document.body.appendChild(probe)
  const s = getComputedStyle(probe)

  let bottom = s.paddingBottom
  if (isStandalonePwa()) {
    bottom = floorPx(bottom, STANDALONE_BOTTOM_PX)
  }

  const root = document.documentElement
  root.style.setProperty('--safe-area-top', s.paddingTop)
  root.style.setProperty('--safe-area-right', s.paddingRight)
  root.style.setProperty('--safe-area-bottom', bottom)
  root.style.setProperty('--safe-area-left', s.paddingLeft)
  root.style.setProperty(
    '--bottom-nav-total',
    `calc(var(--bottom-nav-height) + ${bottom})`,
  )

  probe.remove()
}

export function installSafeAreaInsetListeners(): void {
  if (isStandalonePwa()) {
    document.documentElement.classList.add('pwa-standalone')
  }

  const refresh = () => applySafeAreaInsets()

  refresh()
  requestAnimationFrame(refresh)
  requestAnimationFrame(() => requestAnimationFrame(refresh))

  window.addEventListener('resize', refresh)
  window.addEventListener('orientationchange', refresh)
  window.visualViewport?.addEventListener('resize', refresh)
}
