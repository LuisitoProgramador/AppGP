/** Mide env(safe-area-inset-*) y los expone como CSS vars (iOS PWA tarda en aplicarlos al primer paint). */
export function applySafeAreaInsets(): void {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;top:0;left:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;pointer-events:none;'
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  document.documentElement.style.setProperty('--safe-area-top', style.paddingTop)
  document.documentElement.style.setProperty('--safe-area-right', style.paddingRight)
  document.documentElement.style.setProperty('--safe-area-bottom', style.paddingBottom)
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
