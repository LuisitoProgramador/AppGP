export function formatCurrency(
  amount: number,
  currency = 'MXN',
  locale = 'es-MX',
) {
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}
