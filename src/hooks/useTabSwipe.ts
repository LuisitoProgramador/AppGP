import { useEffect, useRef } from 'react'

const SWIPE_THRESHOLD_PX = 50

const SWIPE_IGNORE_SELECTOR =
  'input, textarea, select, button, a, label, [contenteditable="true"], [data-no-tab-swipe]'

function isInteractiveTouchTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(SWIPE_IGNORE_SELECTOR))
}

export function useTabSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  enabled = true,
) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onSwipeLeftRef = useRef(onSwipeLeft)
  const onSwipeRightRef = useRef(onSwipeRight)
  onSwipeLeftRef.current = onSwipeLeft
  onSwipeRightRef.current = onSwipeRight

  useEffect(() => {
    if (!enabled) return

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      if (isInteractiveTouchTarget(event.target)) return
      touchStart.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchStart.current || event.changedTouches.length !== 1) return
      if (isInteractiveTouchTarget(event.target)) {
        touchStart.current = null
        return
      }

      const dx = event.changedTouches[0].clientX - touchStart.current.x
      const dy = event.changedTouches[0].clientY - touchStart.current.y
      touchStart.current = null

      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy) * 1.25) return

      if (dx < 0) onSwipeLeftRef.current()
      else onSwipeRightRef.current()
    }

    const onTouchCancel = () => {
      touchStart.current = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchCancel, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [enabled])
}
