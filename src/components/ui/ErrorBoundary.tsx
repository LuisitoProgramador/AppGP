import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  title?: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
          <h2 className="text-lg font-semibold text-red-300">
            {this.props.title ?? 'Algo salió mal'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Esta sección encontró un error inesperado.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-white transition active:bg-slate-600"
          >
            Reintentar
          </button>
        </section>
      )
    }

    return this.props.children
  }
}
