import { useEffect, useState } from 'react'
import { getCalendarDay } from '../utils/date'

const POLL_MS = 60_000

/** Día calendario en CDMX; se actualiza cuando cambia la fecha local en México. */
export function useCalendarDay(): number {
  const [day, setDay] = useState(() => getCalendarDay(new Date()))

  useEffect(() => {
    const sync = () => {
      const next = getCalendarDay(new Date())
      setDay((prev) => (prev === next ? prev : next))
    }

    sync()
    const id = window.setInterval(sync, POLL_MS)
    return () => window.clearInterval(id)
  }, [])

  return day
}
