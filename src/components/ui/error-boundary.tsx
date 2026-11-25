'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unexpected client-side rendering errors within dashboard routes
 * and renders a recoverable fallback UI without crashing the shell.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center space-y-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs font-mono text-[var(--color-muted)] leading-relaxed">
                {this.state.error?.message || 'An unexpected interface error occurred on this screen.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-mono font-medium border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:opacity-90 transition-opacity"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
