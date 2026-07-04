import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PendingCuenta } from '../../types/cuenta'
import type { PendingGasto } from '../../types/gasto'
import type { PendingIngreso } from '../../types/ingreso'

interface OfflineDB extends DBSchema {
  'pending-gastos': {
    key: string
    value: PendingGasto
  }
  'pending-cuentas': {
    key: string
    value: PendingCuenta
  }
  'pending-ingresos': {
    key: string
    value: PendingIngreso
  }
}

const DB_NAME = 'appgp-offline'
const STORE_GASTOS = 'pending-gastos'
const STORE_CUENTAS = 'pending-cuentas'
const STORE_INGRESOS = 'pending-ingresos'

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, 3, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_GASTOS)) {
          db.createObjectStore(STORE_GASTOS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_CUENTAS)) {
          db.createObjectStore(STORE_CUENTAS, { keyPath: 'id' })
        }
        if (oldVersion < 3 && !db.objectStoreNames.contains(STORE_INGRESOS)) {
          db.createObjectStore(STORE_INGRESOS, { keyPath: 'id' })
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

function normalizePendingIngreso(ingreso: PendingIngreso): PendingIngreso {
  return {
    ...ingreso,
    retryCount: ingreso.retryCount ?? 0,
  }
}

function normalizePendingCuenta(cuenta: PendingCuenta): PendingCuenta {
  return {
    ...cuenta,
    retryCount: cuenta.retryCount ?? 0,
  }
}

function belongsToUser<T extends { userId?: string }>(item: T, userId: string): boolean {
  return item.userId === userId || item.userId == null
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

export async function getPendingGastosCount(userId: string): Promise<number> {
  const items = await getPendingGastos(userId)
  return items.length
}

export async function getPendingCuentasCount(userId: string): Promise<number> {
  const items = await getPendingCuentas(userId)
  return items.length
}

export async function getPendingGastos(userId: string): Promise<PendingGasto[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_GASTOS)
  return items
    .filter((item) => belongsToUser(item, userId))
    .map(normalizePendingGasto)
    .sort((a, b) => b.createdAt - a.createdAt)
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

export async function getPendingCuentas(userId: string): Promise<PendingCuenta[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_CUENTAS)
  return items
    .filter((item) => belongsToUser(item, userId))
    .map(normalizePendingCuenta)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function updatePendingCuenta(cuenta: PendingCuenta): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CUENTAS, normalizePendingCuenta(cuenta))
}

export async function removePendingCuenta(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_CUENTAS, id)
}

export async function addPendingIngreso(
  ingreso: Omit<PendingIngreso, 'id' | 'createdAt' | 'retryCount'>,
): Promise<PendingIngreso> {
  const db = await getDB()
  const pending: PendingIngreso = {
    ...ingreso,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    retryCount: 0,
  }
  await db.put(STORE_INGRESOS, pending)
  return pending
}

export async function getPendingIngresos(userId: string): Promise<PendingIngreso[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_INGRESOS)
  return items
    .filter((item) => belongsToUser(item, userId))
    .map(normalizePendingIngreso)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function getPendingIngresosCount(userId: string): Promise<number> {
  const items = await getPendingIngresos(userId)
  return items.length
}

export async function updatePendingIngreso(ingreso: PendingIngreso): Promise<void> {
  const db = await getDB()
  await db.put(STORE_INGRESOS, normalizePendingIngreso(ingreso))
}

export async function removePendingIngreso(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_INGRESOS, id)
}

export async function remapPendingGastoCuentaIds(
  userId: string,
  idMap: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(idMap)
  if (entries.length === 0) return

  const db = await getDB()
  const tx = db.transaction(STORE_GASTOS, 'readwrite')
  const pending = (await tx.store.getAll()).filter((item) => belongsToUser(item, userId))

  await Promise.all(
    pending.map(async (gasto) => {
      if (!gasto.cuenta_id || !idMap[gasto.cuenta_id]) return
      await tx.store.put(
        normalizePendingGasto({ ...gasto, cuenta_id: idMap[gasto.cuenta_id] }),
      )
    }),
  )
  await tx.done
}

export async function getTotalPendingCount(userId: string): Promise<number> {
  const [gastosCount, cuentasCount, ingresosCount] = await Promise.all([
    getPendingGastosCount(userId),
    getPendingCuentasCount(userId),
    getPendingIngresosCount(userId),
  ])
  return gastosCount + cuentasCount + ingresosCount
}

/** Elimina cola offline del usuario y entradas legacy sin userId. */
export async function clearOfflineQueueForUser(userId: string): Promise<void> {
  const db = await getDB()
  const [gastos, cuentas, ingresos] = await Promise.all([
    db.getAll(STORE_GASTOS),
    db.getAll(STORE_CUENTAS),
    db.getAll(STORE_INGRESOS),
  ])
  const tx = db.transaction([STORE_GASTOS, STORE_CUENTAS, STORE_INGRESOS], 'readwrite')

  await Promise.all([
    ...gastos
      .filter((item) => belongsToUser(item, userId))
      .map((item) => tx.objectStore(STORE_GASTOS).delete(item.id)),
    ...cuentas
      .filter((item) => belongsToUser(item, userId))
      .map((item) => tx.objectStore(STORE_CUENTAS).delete(item.id)),
    ...ingresos
      .filter((item) => belongsToUser(item, userId))
      .map((item) => tx.objectStore(STORE_INGRESOS).delete(item.id)),
  ])
  await tx.done
}
