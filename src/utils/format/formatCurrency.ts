import { getNumberFormat } from './intlCache'

const defaultCurrencyFormatter = getNumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export function formatCurrency(
  amount: number,
  currency = 'MXN',
  locale = 'es-MX',
) {
  if (!Number.isFinite(amount)) return '—'
  if (currency === 'MXN' && locale === 'es-MX') {
    return defaultCurrencyFormatter.format(amount)
  }
  return getNumberFormat(locale, { style: 'currency', currency }).format(amount)
}
