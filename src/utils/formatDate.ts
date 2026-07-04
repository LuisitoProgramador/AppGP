import { getDateTimeFormat } from './intlCache'

const defaultDateFormatter = getDateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function formatDate(date: Date | string | number, locale = 'es-MX') {
  if (locale === 'es-MX') {
    return defaultDateFormatter.format(new Date(date))
  }
  return getDateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}
