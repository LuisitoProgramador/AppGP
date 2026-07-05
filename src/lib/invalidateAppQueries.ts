import { queryClient } from './queryClient'
import { queryKeys } from './queryKeys'

export function invalidateAppQueries(): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.all })
}
