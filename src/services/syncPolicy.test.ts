import { describe, expect, it } from 'vitest'
import { shouldDiscardAfterRetry } from './syncPolicy'

describe('syncPolicy', () => {
  it('nunca descarta pendientes automáticamente', () => {
    expect(shouldDiscardAfterRetry(0)).toBe(false)
    expect(shouldDiscardAfterRetry(99)).toBe(false)
  })
})
