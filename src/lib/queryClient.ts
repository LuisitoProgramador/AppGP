import { QueryClient } from '@tanstack/react-query'
import { Sentry } from './sentry'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (error) => {
        Sentry.captureException(error)
      },
    },
  },
})
