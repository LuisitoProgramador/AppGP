const BOTTOM_INSET_FLOOR_PX = 34

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isStandalonePwa(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
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

function measureStandaloneBottomInset(): number {
  const doc = document.documentElement
  const vv = window.visualViewport
  const layoutGap = Math.max(0, window.innerHeight - doc.clientHeight)
  const visualGap = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0
  const envInset = measureSafeAreaBottom()

  return Math.max(layoutGap, visualGap, envInset, BOTTOM_INSET_FLOOR_PX)
}

/** Actualiza altura real y safe area inferior. Solo aplica inset extra en PWA instalada. */
export function updateIosViewportMetrics(): void {
  const doc = document.documentElement
  const isStandalone = doc.classList.contains('standalone-pwa')

  doc.style.setProperty('--app-height', `${window.innerHeight}px`)

  if (!isStandalone) {
    doc.style.removeProperty('--bottom-inset')
    doc.style.removeProperty('--bottom-nav-total')
    return
  }

  const inset = measureStandaloneBottomInset()
  doc.style.setProperty('--bottom-inset', `${inset}px`)
  doc.style.setProperty('--bottom-nav-total', `calc(3.25rem + ${inset}px)`)
}

export function initIosViewportMetrics(): void {
  const doc = document.documentElement

  if (isIosDevice()) {
    doc.classList.add('ios-device')
  }

  if (isStandalonePwa()) {
    doc.classList.add('standalone-pwa')
  }

  updateIosViewportMetrics()

  const schedule = () => requestAnimationFrame(updateIosViewportMetrics)

  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)
  window.visualViewport?.addEventListener('resize', schedule)
  window.visualViewport?.addEventListener('scroll', schedule)
}

export function readBottomInsetPx(): number {
  if (!document.documentElement.classList.contains('standalone-pwa')) {
    return 0
  }

  const raw = getComputedStyle(document.documentElement).getPropertyValue('--bottom-inset')
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : BOTTOM_INSET_FLOOR_PX
}
