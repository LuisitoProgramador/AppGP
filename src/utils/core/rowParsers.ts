type CuentaTipo = 'efectivo' | 'debito' | 'credito'

const CUENTA_TIPOS = new Set<CuentaTipo>(['efectivo', 'debito', 'credito'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function readNumber(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function readOptionalNumber(value: unknown): number | null {
  if (value == null) return null
  return readNumber(value)
}

export function parseCuentaTipo(value: unknown): CuentaTipo | null {
  const tipo = readString(value)
  if (tipo && CUENTA_TIPOS.has(tipo as CuentaTipo)) {
    return tipo as CuentaTipo
  }
  return null
}

export function assertRowObject(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Fila inválida de ${label}`)
  }
  return value
}

export { readString, readNumber, readOptionalNumber, isRecord }
