import type { Categoria } from '../types/gasto'
import { supabase } from './supabase'

export interface MerchantMemoryEntry {
  key: string
  descripcion: string
  categoria: Categoria
  montoFrecuente: number
}

interface GastoHistorialRow {
  descripcion: string
  categoria: string
  monto: number
}

function cacheKey(userId: string) {
  return `merchant_memory_${userId}`
}

function normalizeKey(descripcion: string): string {
  return descripcion.trim().toLowerCase()
}

function readCache(userId: string): MerchantMemoryEntry[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return []
    return JSON.parse(raw) as MerchantMemoryEntry[]
  } catch {
    return []
  }
}

function writeCache(userId: string, entries: MerchantMemoryEntry[]) {
  localStorage.setItem(cacheKey(userId), JSON.stringify(entries))
}

function buildEntries(rows: GastoHistorialRow[]): MerchantMemoryEntry[] {
  const groups = new Map<
    string,
    { descripcion: string; categoria: Map<string, number>; montos: Map<number, number> }
  >()

  for (const row of rows) {
    const key = normalizeKey(row.descripcion)
    if (!key) continue

    const current = groups.get(key) ?? {
      descripcion: row.descripcion.trim(),
      categoria: new Map<string, number>(),
      montos: new Map<number, number>(),
    }

    current.categoria.set(row.categoria, (current.categoria.get(row.categoria) ?? 0) + 1)
    const monto = Math.round(Number(row.monto) * 100) / 100
    current.montos.set(monto, (current.montos.get(monto) ?? 0) + 1)
    groups.set(key, current)
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const categoria = [...group.categoria.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Otros'
    const montoFrecuente =
      [...group.montos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0

    return {
      key,
      descripcion: group.descripcion,
      categoria: categoria as Categoria,
      montoFrecuente,
    }
  })
}

export function getMerchantMemory(userId: string): MerchantMemoryEntry[] {
  return readCache(userId)
}

export async function refreshMerchantMemory(userId: string): Promise<MerchantMemoryEntry[]> {
  const { data } = await supabase
    .from('gastos')
    .select('descripcion, categoria, monto')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })
    .limit(200)

  const entries = buildEntries((data ?? []) as GastoHistorialRow[])
  writeCache(userId, entries)
  return entries
}

export function recordMerchantMemory(
  userId: string,
  descripcion: string,
  categoria: Categoria,
  monto: number,
): void {
  const key = normalizeKey(descripcion)
  if (!key) return

  const entries = readCache(userId).filter((entry) => entry.key !== key)
  entries.unshift({
    key,
    descripcion: descripcion.trim(),
    categoria,
    montoFrecuente: Math.round(monto * 100) / 100,
  })
  writeCache(userId, entries.slice(0, 80))
}

export function matchMerchantMemory(
  descripcion: string,
  entries: MerchantMemoryEntry[],
): MerchantMemoryEntry | null {
  const key = normalizeKey(descripcion)
  if (key.length < 2) return null

  const exact = entries.find((entry) => entry.key === key)
  if (exact) return exact

  return (
    entries.find(
      (entry) => entry.key.startsWith(key) || key.startsWith(entry.key),
    ) ?? null
  )
}
