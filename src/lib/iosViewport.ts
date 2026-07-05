const BOTTOM_INSET_FLOOR_PX = 34

function isStandalonePwa(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function measureSafeAreaBottom(): number {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)'
  document.documentElement.appendChild(probe)
  const parsed = parseFloat(getComputedStyle(probe).paddingBottom)
  probe.remove()
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/** Actualiza altura real y safe area inferior (iOS 26 PWA devuelve env() = 0). */
export function updateIosViewportMetrics(): void {
  const doc = document.documentElement
  const appHeight = window.innerHeight

  doc.style.setProperty('--app-height', `${appHeight}px`)

  if (!doc.classList.contains('standalone-pwa')) return

  const layoutGap = Math.max(0, appHeight - doc.clientHeight)
  const envInset = measureSafeAreaBottom()
  const inset = Math.max(layoutGap, envInset, BOTTOM_INSET_FLOOR_PX)

  doc.style.setProperty('--bottom-inset', `${inset}px`)
  doc.style.setProperty('--ios-home-indicator', `${inset}px`)
}

export function initIosViewportMetrics(): void {
  if (isStandalonePwa()) {
    document.documentElement.classList.add('standalone-pwa')
  }

  updateIosViewportMetrics()

  const schedule = () => requestAnimationFrame(updateIosViewportMetrics)

  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)
  window.visualViewport?.addEventListener('resize', schedule)
  window.visualViewport?.addEventListener('scroll', schedule)
}
