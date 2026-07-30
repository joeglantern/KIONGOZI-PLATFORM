import { Component, type ReactNode } from 'react'
import { WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react'

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
        <div className="flex flex-col items-center justify-center py-24 px-6 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-red-500/10">
            <WarningCircle size={32} weight="duotone" className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Something went wrong</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm font-mono">
              {this.state.error.message}
            </p>
          </div>
          <button
            className="btn-secondary flex items-center gap-2 text-xs"
            onClick={() => this.setState({ error: null })}
          >
            <ArrowCounterClockwise size={14} />
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
