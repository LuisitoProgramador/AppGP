/** Coma como decimal (teclado iOS es-MX): "15,50" → decimal; "10,000" → miles. */
function isDecimalComma(value: string, commaIndex: number): boolean {
  const after = value.slice(commaIndex + 1).replace(/\s/g, '')
  const before = value.slice(0, commaIndex)
  if (before.includes('.')) return false

  const digitsAfter = after.replace(/\D/g, '')
  if (digitsAfter.length === 0 || digitsAfter.length > 2) return false

  return commaIndex === value.lastIndexOf(',')
}

function normalizeDecimalSeparators(value: string): string {
  const trimmed = value.trim()
  const lastComma = trimmed.lastIndexOf(',')
  const lastDot = trimmed.lastIndexOf('.')

  if (lastComma !== -1 && (lastDot === -1 || lastComma > lastDot)) {
    if (isDecimalComma(trimmed, lastComma)) {
      return (
        trimmed.slice(0, lastComma).replace(/,/g, '') +
        '.' +
        trimmed.slice(lastComma + 1).replace(/,/g, '')
      )
    }
  }

  return trimmed.replace(/,/g, '')
}

/** Convierte texto con comas (miles o decimal iOS) a número. */
export function parseMontoValue(value: string): number {
  const normalized = normalizeDecimalSeparators(value)
  if (!normalized || normalized === '.') return NaN
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
 * Acepta coma decimal del teclado iOS y la normaliza a punto internamente.
 */
export function formatMontoInput(raw: string): string {
  let normalized = raw
  const lastComma = raw.lastIndexOf(',')
  if (lastComma !== -1 && isDecimalComma(raw, lastComma)) {
    normalized = raw.slice(0, lastComma) + '.' + raw.slice(lastComma + 1)
  }

  const stripped = normalized.replace(/,/g, '')
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
