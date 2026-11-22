import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Keep a rendering failure visible and recoverable instead of clearing the panel. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('No se ha podido mostrar el asistente', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="onboarding">
        <h2>No se ha podido mostrar el asistente</h2>
        <p className="muted">Recarga el panel para volver a abrirlo.</p>
        <p className="error" role="alert">{this.state.error.message}</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>Recargar panel</button>
      </main>
    )
  }
}
