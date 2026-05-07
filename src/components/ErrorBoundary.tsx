import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="min-h-screen bg-film-black flex flex-col items-center justify-center px-4 text-center">
          <p className="text-4xl mb-4">🎬</p>
          <h1 className="text-xl font-bold text-film-text mb-2">Une erreur inattendue s'est produite</h1>
          <p className="text-film-text-dim text-sm mb-6">Rechargez la page pour continuer.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-film-gold text-film-black font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Recharger
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 text-left text-xs text-red-400 bg-black/40 rounded p-3 max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
