import { CATEGORIAS } from '../types/gasto'

export type Categoria = (typeof CATEGORIAS)[number]

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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function parseMontoToken(token: string): number | null {
  const normalized = token.replace(/^\$/, '').replace(/,/g, '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const monto = Number(normalized)
  if (Number.isNaN(monto) || monto <= 0) return null
  return monto
}

function detectCategoria(text: string): Categoria {
  const normalized = normalizeText(text)

  for (const categoria of CATEGORIAS) {
    if (categoria === DEFAULT_CATEGORIA) continue

    const matches = KEYWORDS[categoria].some((keyword) => {
      const pattern = new RegExp(`\\b${normalizeText(keyword)}\\b`, 'i')
      return pattern.test(normalized)
    })

    if (matches) return categoria
  }

  return DEFAULT_CATEGORIA
}

export function parseGastoInput(input: string): ParsedGasto | null {
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
    categoria: detectCategoria(trimmed),
    descripcion,
  }
}
