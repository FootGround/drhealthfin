import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * HealthScoreErrorBoundary Component
 *
 * React Error Boundary specifically for the Health Score feature.
 * Catches JavaScript errors in child components and displays a fallback UI
 * instead of crashing the entire application.
 *
 * Features:
 * - Graceful error handling
 * - User-friendly fallback UI
 * - Refresh button to recover
 * - Dark mode support
 * - Error logging to console
 */
export class HealthScoreErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Log error details for debugging
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Health Score Error:', error, errorInfo);

    // Optional: Send to error tracking service (Sentry, etc.)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  /**
   * Handle refresh button click
   */
  handleRefresh = () => {
    // Reset error state
    this.setState({ hasError: false, error: undefined });

    // Reload the page to recover
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl p-8 text-center bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700">
          {/* Error Icon */}
          <div className="text-6xl mb-4" role="img" aria-label="Warning">
            ⚠️
          </div>

          {/* Error Message */}
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
            Unable to Calculate Health Score
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Market data may be temporarily unavailable. Try refreshing the page.
          </p>

          {/* Refresh Button */}
          <button
            onClick={this.handleRefresh}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
            aria-label="Refresh page"
          >
            Refresh Page
          </button>

          {/* Technical Details (dev mode only) */}
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Technical Details (Dev Mode)
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto max-h-40 text-gray-900 dark:text-gray-100">
                {this.state.error.toString()}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}