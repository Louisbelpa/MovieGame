import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-film-black text-film-text px-4 text-center">
          <p className="text-2xl font-title font-bold text-film-red">Une erreur est survenue</p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-film-text-dim max-w-md overflow-auto text-left border border-film-border rounded p-3">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-film-gold hover:underline"
          >
            Recharger la page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
