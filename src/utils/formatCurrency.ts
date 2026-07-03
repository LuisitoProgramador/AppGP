export function formatCurrency(
  amount: number,
  currency = 'MXN',
  locale = 'es-MX',
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}
