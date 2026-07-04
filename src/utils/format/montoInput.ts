/** Convierte texto con comas a número. */
export function parseMontoValue(value: string): number {
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return NaN
  return Number(normalized)
}

/** Formatea un número para mostrarlo en un input (ej. 10000 → "10,000"). */
export function formatMontoFromNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) return ''
  const [entero, dec] = String(value).split('.')
  const intFormatted = Number(entero).toLocaleString('en-US')
  return dec != null ? `${intFormatted}.${dec.slice(0, 2)}` : intFormatted
}

/**
 * Formatea mientras el usuario escribe: separadores de miles y hasta 2 decimales.
 * Usa coma como separador de miles (estilo es-MX en la parte entera).
 */
export function formatMontoInput(raw: string): string {
  const stripped = raw.replace(/,/g, '')
  if (stripped === '') return ''

  const dotIndex = stripped.indexOf('.')
  const hasDot = dotIndex !== -1
  const intRaw = hasDot ? stripped.slice(0, dotIndex) : stripped
  const decRaw = hasDot ? stripped.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2) : ''

  const intDigits = intRaw.replace(/\D/g, '')
  if (!intDigits && !hasDot) return ''

  const intFormatted =
    intDigits === ''
      ? '0'
      : Number(intDigits).toLocaleString('en-US')

  if (hasDot) {
    return `${intFormatted}.${decRaw}`
  }

  return intFormatted
}
