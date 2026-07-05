const APP_SCROLL_SELECTOR = '[data-app-scroll]'

let lockCount = 0
let savedHtmlOverflow = ''
let savedScrollRootOverflow = ''
let savedBodyPosition = ''
let savedBodyTop = ''
let savedBodyWidth = ''
let savedScrollY = 0

function getScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(APP_SCROLL_SELECTOR)
}

/** Bloquea el scroll de la app (contador para modales anidados). */
export function lockBodyScroll(): () => void {
  lockCount += 1

  if (lockCount === 1) {
    savedScrollY = window.scrollY
    savedHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    savedBodyPosition = document.body.style.position
    savedBodyTop = document.body.style.top
    savedBodyWidth = document.body.style.width
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.width = '100%'

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
      document.body.style.position = savedBodyPosition
      document.body.style.top = savedBodyTop
      document.body.style.width = savedBodyWidth
      window.scrollTo(0, savedScrollY)

      const scrollRoot = getScrollRoot()
      if (scrollRoot) {
        scrollRoot.style.overflow = savedScrollRootOverflow
      }
    }
  }
}
