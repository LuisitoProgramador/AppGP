const APP_SCROLL_SELECTOR = '[data-app-scroll]'

let lockCount = 0
let savedHtmlOverflow = ''
let savedScrollRootOverflow = ''

function getScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(APP_SCROLL_SELECTOR)
}

/** Bloquea el scroll de la app (contador para modales anidados). */
export function lockBodyScroll(): () => void {
  lockCount += 1

  if (lockCount === 1) {
    savedHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    const scrollRoot = getScrollRoot()
    if (scrollRoot) {
      savedScrollRootOverflow = scrollRoot.style.overflow
      scrollRoot.style.overflow = 'hidden'
    }
  }

  return () => {
    lockCount = Math.max(0, lockCount - 1)

    if (lockCount === 0) {
      document.documentElement.style.overflow = savedHtmlOverflow
      const scrollRoot = getScrollRoot()
      if (scrollRoot) {
        scrollRoot.style.overflow = savedScrollRootOverflow
      }
    }
  }
}
