import type { Categoria } from '../types/gasto'
import { matchMerchantMemory, type MerchantMemoryEntry } from './merchantMemory'

export interface CategoryRule {
  id: string
  patron: string
  categoria: Categoria
}

function storageKey(userId: string) {
  return `category_rules_${userId}`
}

export function getCategoryRules(userId: string): CategoryRule[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    return JSON.parse(raw) as CategoryRule[]
  } catch {
    return []
  }
}

function writeRules(userId: string, rules: CategoryRule[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(rules.slice(0, 40)))
}

export function addCategoryRule(
  userId: string,
  patron: string,
  categoria: Categoria,
): { ok: boolean; error?: string } {
  const limpio = patron.trim().toLowerCase()
  if (limpio.length < 2) return { ok: false, error: 'Escribe al menos 2 caracteres.' }

  const rules = getCategoryRules(userId).filter((r) => r.patron !== limpio)
  rules.unshift({
    id: crypto.randomUUID(),
    patron: limpio,
    categoria,
  })
  writeRules(userId, rules)
  return { ok: true }
}

export function removeCategoryRule(userId: string, id: string): void {
  writeRules(
    userId,
    getCategoryRules(userId).filter((r) => r.id !== id),
  )
}

export function resolveCategoriaFromRules(
  descripcion: string,
  rules: CategoryRule[],
  merchantEntries: MerchantMemoryEntry[],
  fallback: Categoria,
): Categoria {
  const key = descripcion.trim().toLowerCase()
  if (key.length >= 2) {
    const rule = rules.find((r) => key.includes(r.patron) || r.patron.includes(key))
    if (rule) return rule.categoria
  }

  const merchant = matchMerchantMemory(descripcion, merchantEntries)
  if (merchant) return merchant.categoria

  return fallback
}
