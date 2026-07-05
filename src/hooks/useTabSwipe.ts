import { useCallback, useMemo, useRef, type TouchEventHandler } from 'react'

const SWIPE_THRESHOLD_PX = 50

export function useTabSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onSwipeLeftRef = useRef(onSwipeLeft)
  const onSwipeRightRef = useRef(onSwipeRight)
  onSwipeLeftRef.current = onSwipeLeft
  onSwipeRightRef.current = onSwipeRight

  const onTouchStart = useCallback<TouchEventHandler>((event) => {
    if (event.touches.length !== 1) return
    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    }
  }, [])

  const onTouchEnd = useCallback<TouchEventHandler>((event) => {
    if (!touchStart.current || event.changedTouches.length !== 1) return

    const dx = event.changedTouches[0].clientX - touchStart.current.x
    const dy = event.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy) * 1.25) return

    if (dx < 0) onSwipeLeftRef.current()
    else onSwipeRightRef.current()
  }, [])

  return useMemo(
    () => ({
      onTouchStart,
      onTouchEnd,
      style: { touchAction: 'pan-y pinch-zoom' } as const,
    }),
    [onTouchStart, onTouchEnd],
  )
}
