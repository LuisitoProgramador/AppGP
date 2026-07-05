import { CATEGORIAS_DEFAULT, type Categoria } from '../types/gasto'

const MAX_CATEGORIAS = 15

function storageKey(userId: string) {
  return `categorias_${userId}`
}

function normalizeNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ')
}

export function getCategoriasUsuario(userId: string): Categoria[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return [...CATEGORIAS_DEFAULT]
    const custom = JSON.parse(raw) as string[]
    const merged: Categoria[] = [...CATEGORIAS_DEFAULT]
    for (const nombre of custom) {
      const limpio = normalizeNombre(nombre)
      if (!limpio || merged.includes(limpio)) continue
      merged.push(limpio)
    }
    return merged.slice(0, MAX_CATEGORIAS)
  } catch {
    return [...CATEGORIAS_DEFAULT]
  }
}

export function getCategoriasCustom(userId: string): string[] {
  return getCategoriasUsuario(userId).filter((c) => !CATEGORIAS_DEFAULT.includes(c as (typeof CATEGORIAS_DEFAULT)[number]))
}

export function addCategoriaUsuario(userId: string, nombre: string): { ok: boolean; error?: string } {
  const limpio = normalizeNombre(nombre)
  if (!limpio) return { ok: false, error: 'Escribe un nombre.' }
  if (limpio.length > 40) return { ok: false, error: 'Máximo 40 caracteres.' }

  const actuales = getCategoriasUsuario(userId)
  if (actuales.some((c) => c.toLowerCase() === limpio.toLowerCase())) {
    return { ok: false, error: 'Esa categoría ya existe.' }
  }
  if (actuales.length >= MAX_CATEGORIAS) {
    return { ok: false, error: `Máximo ${MAX_CATEGORIAS} categorías.` }
  }

  const custom = getCategoriasCustom(userId)
  custom.push(limpio)
  localStorage.setItem(storageKey(userId), JSON.stringify(custom))
  return { ok: true }
}

export function removeCategoriaCustom(userId: string, nombre: string): boolean {
  const custom = getCategoriasCustom(userId).filter(
    (c) => c.toLowerCase() !== nombre.trim().toLowerCase(),
  )
  localStorage.setItem(storageKey(userId), JSON.stringify(custom))
  return true
}

export function categoriaSelectOptions(categorias: Categoria[]) {
  return categorias.map((categoria) => ({ value: categoria, label: categoria }))
}

export function categoriaFilterOptions(categorias: Categoria[]) {
  return [{ value: 'Todas', label: 'Todas las categorías' }, ...categoriaSelectOptions(categorias)]
}
