import { useEffect, useState } from 'react'

export const CHART_ANIMATION_MS = 300

/** Respeta prefers-reduced-motion; activa animaciones Recharts en ProMotion. */
export function useChartAnimation(): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  return active
}
