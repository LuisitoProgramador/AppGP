import type { Categoria } from '../types/gasto'
import { supabase } from './supabase'

export interface MerchantMemoryEntry {
  key: string
  descripcion: string
  categoria: Categoria
  montoFrecuente: number
  frecuencia: number
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

function normalizeEntry(entry: MerchantMemoryEntry): MerchantMemoryEntry {
  return {
    ...entry,
    frecuencia: entry.frecuencia > 0 ? entry.frecuencia : 1,
  }
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
  try {
    const normalized = entries.map(normalizeEntry)
    localStorage.setItem(cacheKey(userId), JSON.stringify(normalized))
  } catch {
    /* ignore QuotaExceededError and other storage failures */
  }
}

function modeFromCounts<T>(counts: Map<T, number>, fallback: T): T {
  let best = fallback
  let max = 0
  for (const [value, count] of counts) {
    if (count > max) {
      max = count
      best = value
    }
  }
  return best
}

function buildEntries(rows: GastoHistorialRow[]): MerchantMemoryEntry[] {
  const groups = new Map<
    string,
    {
      descripcion: string
      categoria: Map<string, number>
      montos: Map<number, number>
      frecuencia: number
    }
  >()

  for (const row of rows) {
    const key = normalizeKey(row.descripcion)
    if (!key) continue

    const current = groups.get(key) ?? {
      descripcion: row.descripcion.trim(),
      categoria: new Map<string, number>(),
      montos: new Map<number, number>(),
      frecuencia: 0,
    }

    current.frecuencia += 1
    current.categoria.set(row.categoria, (current.categoria.get(row.categoria) ?? 0) + 1)
    const monto = Math.round(Number(row.monto) * 100) / 100
    current.montos.set(monto, (current.montos.get(monto) ?? 0) + 1)
    groups.set(key, current)
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const categoria = modeFromCounts(group.categoria, 'Otros')
    const montoFrecuente = modeFromCounts(group.montos, 0)

    return {
      key,
      descripcion: group.descripcion,
      categoria: categoria as Categoria,
      montoFrecuente,
      frecuencia: group.frecuencia,
    }
  })
}

function entriesToMap(entries: MerchantMemoryEntry[]): Map<string, MerchantMemoryEntry> {
  return new Map(entries.map((entry) => [entry.key, entry]))
}

export function getMerchantMemory(userId: string): MerchantMemoryEntry[] {
  return readCache(userId)
}

export function getTopMerchantMemory(
  entries: MerchantMemoryEntry[],
  limit = 4,
): MerchantMemoryEntry[] {
  return [...entries]
    .sort((a, b) => {
      const freqDiff = b.frecuencia - a.frecuencia
      if (freqDiff !== 0) return freqDiff
      return a.descripcion.localeCompare(b.descripcion, 'es')
    })
    .slice(0, limit)
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

  const cached = readCache(userId)
  const byKey = entriesToMap(cached)
  const existing = byKey.get(key)

  byKey.delete(key)
  const entries = [
    {
      key,
      descripcion: descripcion.trim(),
      categoria,
      montoFrecuente: Math.round(monto * 100) / 100,
      frecuencia: (existing?.frecuencia ?? 0) + 1,
    },
    ...byKey.values(),
  ]
  writeCache(userId, entries.slice(0, 80))
}

export function matchMerchantMemory(
  descripcion: string,
  entries: MerchantMemoryEntry[],
): MerchantMemoryEntry | null {
  const key = normalizeKey(descripcion)
  if (key.length < 2) return null

  const byKey = entriesToMap(entries)
  const exact = byKey.get(key)
  if (exact) return exact

  return (
    entries.find(
      (entry) => entry.key.startsWith(key) || key.startsWith(entry.key),
    ) ?? null
  )
}
