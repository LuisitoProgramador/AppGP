import { lazy, type ComponentType } from 'react'

const CHUNK_RETRY_DELAY_MS = 800

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to fetch')
  )
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (firstError) {
      if (!isChunkLoadError(firstError)) throw firstError
      await new Promise((resolve) => setTimeout(resolve, CHUNK_RETRY_DELAY_MS))
      return factory()
    }
  })
}
