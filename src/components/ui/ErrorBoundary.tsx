import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Sentry } from '../../lib/sentry'

interface ErrorBoundaryProps {
  children: ReactNode
  title?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false
  const msg = error.message
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to fetch')
  )
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    })
  }

  private handleRetry = () => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const staleBundle = isChunkLoadError(this.state.error)

      return (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
          <h2 className="text-lg font-semibold text-red-300">
            {this.props.title ?? 'Algo salió mal'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {staleBundle
              ? 'Hay una versión nueva de la app. Recarga para continuar.'
              : 'Esta sección encontró un error inesperado.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-white transition active:bg-slate-600"
          >
            {staleBundle ? 'Recargar app' : 'Reintentar'}
          </button>
        </section>
      )
    }

    return this.props.children
  }
}
