import React, { Component, ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-surface-app">
                    <h1 className="text-3xl font-bold text-brand-hover mb-4">Something went wrong</h1>
                    <p className="text-content-secondary mb-6">{this.state.error?.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-brand text-content-inverse rounded-sm hover:bg-brand-hover transition-colors"
                    >
                        Try again
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}

export default ErrorBoundary
