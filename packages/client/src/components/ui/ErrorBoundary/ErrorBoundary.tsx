// ErrorBoundary - Catches React errors and displays fallback UI
// Provides recovery options: retry render, go home, or reload page

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Icon, AlertIcon, RefreshIcon, HomeIcon } from '../Icon';
import styles from './ErrorBoundary.module.css';

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback component (receives error and reset function) */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Component name for error reporting */
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary catches JavaScript errors in child components and displays
 * a fallback UI with recovery options.
 *
 * @example
 * ```tsx
 * <ErrorBoundary componentName="GameBoard">
 *   <GameBoard {...props} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback({ error, reset: this.handleReset });
      }

      // Default fallback UI
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContent}>
            <div className={styles.iconContainer}>
              <Icon icon={AlertIcon} size="xl" className={styles.errorIcon} />
            </div>

            <h2 className={styles.title}>Something went wrong</h2>

            {componentName && (
              <p className={styles.componentName}>Error in: {componentName}</p>
            )}

            <p className={styles.message}>
              {error.message || 'An unexpected error occurred'}
            </p>

            <div className={styles.actions}>
              <button
                className={`${styles.button} ${styles.primary}`}
                onClick={this.handleReset}
              >
                <Icon icon={RefreshIcon} size="sm" />
                <span>Try Again</span>
              </button>

              <button
                className={`${styles.button} ${styles.secondary}`}
                onClick={this.handleGoHome}
              >
                <Icon icon={HomeIcon} size="sm" />
                <span>Go Home</span>
              </button>
            </div>

            <button
              className={styles.reloadLink}
              onClick={this.handleReload}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
