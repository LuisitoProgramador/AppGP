import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PendingCuenta } from '../types/cuenta'
import type { PendingGasto } from '../types/gasto'

interface OfflineDB extends DBSchema {
  'pending-gastos': {
    key: string
    value: PendingGasto
  }
  'pending-cuentas': {
    key: string
    value: PendingCuenta
  }
}

const DB_NAME = 'appgp-offline'
const STORE_GASTOS = 'pending-gastos'
const STORE_CUENTAS = 'pending-cuentas'

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_GASTOS)) {
          db.createObjectStore(STORE_GASTOS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_CUENTAS)) {
          db.createObjectStore(STORE_CUENTAS, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

function normalizePendingGasto(gasto: PendingGasto): PendingGasto {
  return {
    ...gasto,
    retryCount: gasto.retryCount ?? 0,
  }
}

function normalizePendingCuenta(cuenta: PendingCuenta): PendingCuenta {
  return {
    ...cuenta,
    retryCount: cuenta.retryCount ?? 0,
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
  await db.put(STORE_GASTOS, pending)
  return pending
}

export async function getPendingGastos(): Promise<PendingGasto[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_GASTOS)
  return items.map(normalizePendingGasto).sort((a, b) => b.createdAt - a.createdAt)
}

export async function updatePendingGasto(gasto: PendingGasto): Promise<void> {
  const db = await getDB()
  await db.put(STORE_GASTOS, normalizePendingGasto(gasto))
}

export async function removePendingGasto(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_GASTOS, id)
}

export async function addPendingCuenta(
  cuenta: Omit<PendingCuenta, 'id' | 'createdAt' | 'retryCount'>,
): Promise<PendingCuenta> {
  const db = await getDB()
  const pending: PendingCuenta = {
    ...cuenta,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    retryCount: 0,
  }
  await db.put(STORE_CUENTAS, pending)
  return pending
}

export async function getPendingCuentas(): Promise<PendingCuenta[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_CUENTAS)
  return items.map(normalizePendingCuenta).sort((a, b) => b.createdAt - a.createdAt)
}

export async function updatePendingCuenta(cuenta: PendingCuenta): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CUENTAS, normalizePendingCuenta(cuenta))
}

export async function removePendingCuenta(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_CUENTAS, id)
}

export async function remapPendingGastoCuentaIds(idMap: Record<string, string>): Promise<void> {
  const entries = Object.entries(idMap)
  if (entries.length === 0) return

  const pending = await getPendingGastos()
  for (const gasto of pending) {
    if (!gasto.cuenta_id || !idMap[gasto.cuenta_id]) continue
    await updatePendingGasto({ ...gasto, cuenta_id: idMap[gasto.cuenta_id] })
  }
}

export async function getTotalPendingCount(): Promise<number> {
  const [gastos, cuentas] = await Promise.all([getPendingGastos(), getPendingCuentas()])
  return gastos.length + cuentas.length
}
