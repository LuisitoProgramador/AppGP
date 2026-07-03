import { describe, expect, it } from 'vitest'
import { MAX_SYNC_RETRIES, shouldDiscardAfterRetry } from './syncPolicy'

describe('syncPolicy', () => {
  it('descarta después del máximo de reintentos', () => {
    expect(shouldDiscardAfterRetry(MAX_SYNC_RETRIES)).toBe(true)
    expect(shouldDiscardAfterRetry(MAX_SYNC_RETRIES - 1)).toBe(false)
  })
})
