'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 [ERROR-BOUNDARY] Error caught by boundary:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 [ERROR-BOUNDARY] Error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary
    });

    this.setState({ error, errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    console.log('🔄 [ERROR-BOUNDARY] Resetting error boundary');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ops! Algo deu errado
            </h2>
            
            <p className="text-gray-600 mb-6">
              Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <h3 className="font-semibold text-red-800 mb-2">Detalhes do erro (desenvolvimento):</h3>
                <code className="text-xs text-red-700 block whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack && '\n\n' + this.state.error.stack}
                </code>
              </div>
            )}
            
            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                variant="primary"
                className="w-full"
              >
                Tentar novamente
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components error handling
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`🚨 [ERROR-HANDLER] ${context || 'Unhandled error'}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // You could integrate with error reporting service here
    // Example: Sentry.captureException(error, { extra: { context } });
  }, []);

  return handleError;
}