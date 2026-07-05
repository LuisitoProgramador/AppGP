import { describe, expect, it } from 'vitest'
import { isPermanentSyncError, MAX_SYNC_RETRIES, shouldDiscardAfterRetry } from './syncPolicy'

describe('syncPolicy', () => {
  it('descarta errores permanentes de inmediato', () => {
    expect(isPermanentSyncError('new row violates row-level security policy')).toBe(true)
    expect(shouldDiscardAfterRetry(1, 'new row violates row-level security policy')).toBe(true)
    expect(shouldDiscardAfterRetry(0, 'Grupo MSI inconsistente')).toBe(true)
  })

  it('descarta errores de sintaxis y permisos de inmediato', () => {
    expect(isPermanentSyncError('syntax error at or near "from"')).toBe(true)
    expect(isPermanentSyncError('permission denied for table gastos')).toBe(true)
  })

  it('reintenta errores transitorios hasta MAX_SYNC_RETRIES', () => {
    expect(shouldDiscardAfterRetry(0, 'Network request failed')).toBe(false)
    expect(shouldDiscardAfterRetry(MAX_SYNC_RETRIES - 1, 'timeout')).toBe(false)
    expect(shouldDiscardAfterRetry(MAX_SYNC_RETRIES, 'timeout')).toBe(true)
  })
})
