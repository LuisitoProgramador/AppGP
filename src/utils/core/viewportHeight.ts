/** Ajusta #root al alto visible en iOS PWA (evita franja muerta bajo el home indicator). */
export function installViewportHeightFix(): void {
  const sync = () => {
    const viewport = window.visualViewport
    if (!viewport) {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
      document.documentElement.style.setProperty('--app-offset-top', '0px')
      return
    }

    document.documentElement.style.setProperty('--app-height', `${Math.round(viewport.height)}px`)
    document.documentElement.style.setProperty('--app-offset-top', `${Math.round(viewport.offsetTop)}px`)
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
