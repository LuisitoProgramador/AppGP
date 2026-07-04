import { listMetasAhorro as fetchMetasAhorro } from './crud'
import { ensureMetaAhorroAnioCalendario } from './sync'

export {
  addAhorroToMeta,
  createMetaAhorro,
  deleteMetaAhorro,
  updateMetaAhorro,
} from './crud'
export {
  ensureMetaAhorroAnioCalendario,
  syncMetasAnualesConPresupuesto,
  syncPendingMetaAhorro,
  type PresupuestoMetaSync,
} from './sync'

export async function listMetasAhorro(userId: string) {
  await ensureMetaAhorroAnioCalendario(userId)
  return fetchMetasAhorro(userId)
}
