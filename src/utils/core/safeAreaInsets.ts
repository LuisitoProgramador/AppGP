/** Mide env(safe-area-inset-*) y los expone como CSS vars (iOS PWA tarda en aplicarlos al primer paint). */
function readInsetPx(value: string): number {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function applySafeAreaInsets(): void {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;pointer-events:none;'
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const root = document.documentElement

  const top = readInsetPx(style.paddingTop)
  const right = readInsetPx(style.paddingRight)
  const bottom = readInsetPx(style.paddingBottom)
  const left = readInsetPx(style.paddingLeft)

  root.style.setProperty('--safe-area-top', `${top}px`)
  root.style.setProperty('--safe-area-right', `${right}px`)
  root.style.setProperty('--safe-area-bottom', `${bottom}px`)
  root.style.setProperty('--safe-area-left', `${left}px`)
  probe.remove()
}

export function installSafeAreaInsetListeners(): void {
  const refresh = () => applySafeAreaInsets()

  refresh()
  requestAnimationFrame(refresh)
  requestAnimationFrame(() => requestAnimationFrame(refresh))

  window.addEventListener('resize', refresh)
  window.addEventListener('orientationchange', refresh)
  window.visualViewport?.addEventListener('resize', refresh)
}
