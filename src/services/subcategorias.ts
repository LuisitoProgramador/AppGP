/** Subcategorías opcionales bajo una categoría padre (local, app personal). */

export const SUBCATEGORIA_SEP = ' › '

const MAX_SUBCATEGORIAS_POR_PADRE = 10

function storageKey(userId: string) {
  return `subcategorias_${userId}`
}

function normalizeNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ')
}

export function categoriaPadre(categoria: string): string {
  const idx = categoria.indexOf(SUBCATEGORIA_SEP)
  return idx === -1 ? categoria : categoria.slice(0, idx)
}

export function parseCategoriaParts(categoria: string): { padre: string; sub: string | null } {
  const idx = categoria.indexOf(SUBCATEGORIA_SEP)
  if (idx === -1) return { padre: categoria, sub: null }
  return {
    padre: categoria.slice(0, idx),
    sub: categoria.slice(idx + SUBCATEGORIA_SEP.length) || null,
  }
}

export function buildCategoriaConSub(padre: string, sub?: string | null): string {
  const subLimpio = sub ? normalizeNombre(sub) : ''
  if (!subLimpio) return padre
  return `${padre}${SUBCATEGORIA_SEP}${subLimpio}`
}

function readAll(userId: string): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, string[]>
  } catch {
    return {}
  }
}

function writeAll(userId: string, data: Record<string, string[]>): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(data))
}

export function getSubcategorias(userId: string, padre: string): string[] {
  const lista = readAll(userId)[padre] ?? []
  return lista.slice(0, MAX_SUBCATEGORIAS_POR_PADRE)
}

export function addSubcategoria(
  userId: string,
  padre: string,
  nombre: string,
): { ok: boolean; error?: string } {
  const limpio = normalizeNombre(nombre)
  if (!limpio) return { ok: false, error: 'Escribe un nombre.' }
  if (limpio.includes(SUBCATEGORIA_SEP)) {
    return { ok: false, error: 'El nombre no puede contener ›.' }
  }
  if (limpio.length > 30) return { ok: false, error: 'Máximo 30 caracteres.' }

  const all = readAll(userId)
  const actuales = all[padre] ?? []
  if (actuales.some((s) => s.toLowerCase() === limpio.toLowerCase())) {
    return { ok: false, error: 'Esa subcategoría ya existe.' }
  }
  if (actuales.length >= MAX_SUBCATEGORIAS_POR_PADRE) {
    return { ok: false, error: `Máximo ${MAX_SUBCATEGORIAS_POR_PADRE} subcategorías por categoría.` }
  }

  all[padre] = [...actuales, limpio]
  writeAll(userId, all)
  return { ok: true }
}

export function removeSubcategoria(userId: string, padre: string, nombre: string): void {
  const all = readAll(userId)
  all[padre] = (all[padre] ?? []).filter(
    (s) => s.toLowerCase() !== nombre.trim().toLowerCase(),
  )
  if (all[padre]?.length === 0) delete all[padre]
  writeAll(userId, all)
}

export function subcategoriaSelectOptions(subs: string[]) {
  return [
    { value: '', label: 'Sin subcategoría' },
    ...subs.map((sub) => ({ value: sub, label: sub })),
  ]
}

export function aggregateGastosPorCategoriaPadre(
  gastosPorCategoria: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [categoria, total] of Object.entries(gastosPorCategoria)) {
    const padre = categoriaPadre(categoria)
    out[padre] = (out[padre] ?? 0) + total
  }
  return out
}
