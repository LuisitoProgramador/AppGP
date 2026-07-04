import { useRef, type TouchEventHandler } from 'react'

export function useTabSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart: TouchEventHandler = (event) => {
    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    }
  }

  const onTouchEnd: TouchEventHandler = (event) => {
    if (!touchStart.current) return

    const dx = event.changedTouches[0].clientX - touchStart.current.x
    const dy = event.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return

    if (dx < 0) onSwipeLeft()
    else onSwipeRight()
  }

  return { onTouchStart, onTouchEnd }
}
