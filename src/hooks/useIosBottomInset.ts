import { useSyncExternalStore } from 'react'
import { readBottomInsetPx } from '../lib/iosViewport'

function subscribe(onStoreChange: () => void) {
  const schedule = () => requestAnimationFrame(onStoreChange)

  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)
  window.visualViewport?.addEventListener('resize', schedule)
  window.visualViewport?.addEventListener('scroll', schedule)

  return () => {
    window.removeEventListener('resize', schedule)
    window.removeEventListener('orientationchange', schedule)
    window.visualViewport?.removeEventListener('resize', schedule)
    window.visualViewport?.removeEventListener('scroll', schedule)
  }
}

export function useIosBottomInset(): number {
  return useSyncExternalStore(subscribe, readBottomInsetPx, () => 34)
}
