import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1 : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (import.meta.env.DEV) {
        console.error('[Sentry]', event.exception?.values?.[0]?.value ?? event.message)
      }
      return event
    },
  })

  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason)
  })
}

export { Sentry }
