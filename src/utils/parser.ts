import { CATEGORIAS_DEFAULT, type Categoria } from '../types/gasto'
import { parseMontoValue } from './montoInput'

export type { Categoria }

export interface ParsedGasto {
  monto: number
  categoria: Categoria
  descripcion: string
}

const KEYWORDS: Record<Categoria, readonly string[]> = {
  Comida: [
    'tacos',
    'taco',
    'cafe',
    'café',
    'restaurante',
    'comida',
    'super',
    'supermercado',
    'oxxo',
    'despensa',
    'pizza',
    'lunch',
    'cena',
    'desayuno',
    'almuerzo',
    'snack',
  ],
  Transporte: [
    'uber',
    'didi',
    'taxi',
    'gasolina',
    'gas',
    'metro',
    'bus',
    'transporte',
    'estacionamiento',
    'parking',
    'camion',
    'camión',
  ],
  Casa: [
    'renta',
    'luz',
    'agua',
    'internet',
    'casa',
    'hogar',
    'limpieza',
    'cfe',
    'telmex',
    'mantenimiento',
  ],
  Suscripciones: [
    'netflix',
    'spotify',
    'disney',
    'prime',
    'suscripcion',
    'suscripción',
    'subscription',
    'apple',
    'google',
    'hbo',
    'youtube',
  ],
  Otros: [],
}

const DEFAULT_CATEGORIA: Categoria = 'Otros'

const KEYWORD_PATTERNS: Partial<Record<Categoria, RegExp[]>> = Object.fromEntries(
  CATEGORIAS_DEFAULT.map((categoria) => {
    if (categoria === DEFAULT_CATEGORIA) return [categoria, [] as RegExp[]]
    const patterns = KEYWORDS[categoria].map((keyword) => {
      const normalized = keyword
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
      return new RegExp(`\\b${normalized}\\b`, 'i')
    })
    return [categoria, patterns]
  }),
)

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function parseMontoToken(token: string): number | null {
  const stripped = token.replace(/^\$/, '').trim()
  if (!/^\d[\d,]*(?:\.\d{1,2})?$/.test(stripped)) return null

  const monto = parseMontoValue(stripped)
  if (!Number.isFinite(monto) || monto <= 0) return null
  return monto
}

export interface CategoriaMemoryEntry {
  descripcion: string
  categoria: Categoria
}

function normalizeDescripcionKey(descripcion: string): string {
  return normalizeText(descripcion.trim())
}

export function inferCategoriaFromHistorial(
  descripcion: string,
  historial: CategoriaMemoryEntry[],
): Categoria | null {
  const key = normalizeDescripcionKey(descripcion)
  if (key.length < 2 || historial.length === 0) return null

  const exact = historial.find(
    (entry) => normalizeDescripcionKey(entry.descripcion) === key,
  )
  if (exact) return exact.categoria

  const partial = historial.find((entry) => {
    const entryKey = normalizeDescripcionKey(entry.descripcion)
    return entryKey.startsWith(key) || key.startsWith(entryKey)
  })
  return partial?.categoria ?? null
}

function detectCategoria(
  text: string,
  historial: CategoriaMemoryEntry[] = [],
  categorias: readonly Categoria[] = CATEGORIAS_DEFAULT,
): Categoria {
  const fromHistorial = inferCategoriaFromHistorial(text, historial)
  if (fromHistorial) return fromHistorial

  const normalized = normalizeText(text)

  for (const categoria of CATEGORIAS_DEFAULT) {
    if (categoria === DEFAULT_CATEGORIA) continue

    const patterns = KEYWORD_PATTERNS[categoria] ?? []
    const matches = patterns.some((pattern) => pattern.test(normalized))
    if (matches) return categoria
  }

  return categorias.includes(DEFAULT_CATEGORIA) ? DEFAULT_CATEGORIA : (categorias[0] ?? DEFAULT_CATEGORIA)
}

export function parseGastoInput(
  input: string,
  historial: CategoriaMemoryEntry[] = [],
  categorias: readonly Categoria[] = CATEGORIAS_DEFAULT,
): ParsedGasto | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const tokens = trimmed.split(/\s+/)
  let monto: number | null = null
  let montoIndex = -1

  for (let i = 0; i < tokens.length; i++) {
    const parsed = parseMontoToken(tokens[i])
    if (parsed !== null) {
      monto = parsed
      montoIndex = i
      break
    }
  }

  if (monto === null) return null

  const descripcionTokens = tokens.filter((_, index) => index !== montoIndex)
  const descripcion = descripcionTokens.join(' ').trim() || 'Gasto'

  return {
    monto,
    categoria: detectCategoria(trimmed, historial, categorias),
    descripcion,
  }
}
