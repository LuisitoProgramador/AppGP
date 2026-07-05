/** Ajusta --app-height al alto visible en iOS PWA (Safari / standalone). */
export function installViewportHeightFix(): void {
  const sync = () => {
    const viewport = window.visualViewport
    if (!viewport) {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
      return
    }

    document.documentElement.style.setProperty('--app-height', `${Math.round(viewport.height)}px`)
  }

  sync()
  requestAnimationFrame(sync)

  window.visualViewport?.addEventListener('resize', sync)
  window.visualViewport?.addEventListener('scroll', sync)
  window.addEventListener('resize', sync)
  window.addEventListener('orientationchange', () => {
    requestAnimationFrame(sync)
    window.setTimeout(sync, 150)
  })
}
