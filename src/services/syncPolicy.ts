export const MAX_SYNC_RETRIES = 3

export function shouldDiscardAfterRetry(retryCount: number): boolean {
  return retryCount >= MAX_SYNC_RETRIES
}
