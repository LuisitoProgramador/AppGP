import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PendingGasto } from '../types/gasto'

interface OfflineDB extends DBSchema {
  'pending-gastos': {
    key: string
    value: PendingGasto
  }
}

const DB_NAME = 'appgp-offline'
const STORE = 'pending-gastos'

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

function normalizePending(gasto: PendingGasto): PendingGasto {
  return {
    ...gasto,
    retryCount: gasto.retryCount ?? 0,
  }
}

export async function addPendingGasto(
  gasto: Omit<PendingGasto, 'id' | 'createdAt' | 'retryCount'>,
): Promise<PendingGasto> {
  const db = await getDB()
  const pending: PendingGasto = {
    ...gasto,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    retryCount: 0,
  }
  await db.put(STORE, pending)
  return pending
}

export async function getPendingGastos(): Promise<PendingGasto[]> {
  const db = await getDB()
  const items = await db.getAll(STORE)
  return items.map(normalizePending).sort((a, b) => b.createdAt - a.createdAt)
}

export async function updatePendingGasto(gasto: PendingGasto): Promise<void> {
  const db = await getDB()
  await db.put(STORE, normalizePending(gasto))
}

export async function removePendingGasto(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}
