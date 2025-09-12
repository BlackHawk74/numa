// Error notification components with monochrome styling

import React, { useEffect, useState } from 'react';
import { ErrorInfo } from '../utils/errorHandling';

interface ErrorNotificationProps {
  error: ErrorInfo | null | undefined;
  onDismiss: () => void;
  onRetry?: () => void;
  className?: string;
}

export function ErrorNotification({ 
  error, 
  onDismiss, 
  onRetry, 
  className = '' 
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      // Auto-dismiss low severity errors after 5 seconds
      if (error.severity === 'low') {
        const timer = setTimeout(() => {
          handleDismiss();
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  };

  if (!error || !isVisible) return null;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-charcoal bg-gray-50';
      case 'high':
        return 'border-gray-400 bg-gray-50';
      case 'medium':
        return 'border-gray-300 bg-white';
      case 'low':
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'network':
        return '📡';
      case 'audio':
        return '🎤';
      case 'permission':
        return '🔒';
      case 'api':
        return '⚡';
      case 'validation':
        return '⚠️';
      default:
        return '❌';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      <div 
        className={`
          border-2 p-4 shadow-sm transition-all duration-300 ease-out
          ${getSeverityStyles(error.severity)}
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        `}
      >
        <div className="flex items-start space-x-3">
          <span className="text-lg flex-shrink-0 mt-0.5">
            {getIcon(error.type)}
          </span>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-charcoal mb-1">
              {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
            </p>
            <p className="text-sm text-gray-600 font-light leading-relaxed">
              {error.userMessage}
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer font-medium">
                  Technical Details
                </summary>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {error.message}
                </p>
              </details>
            )}
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-charcoal transition-colors duration-200"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error.retryable && onRetry && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={onRetry}
                className="px-3 py-1 text-xs font-medium text-charcoal border border-charcoal hover:bg-charcoal hover:text-white transition-colors duration-200 uppercase tracking-wide"
              >
                Try Again
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1 text-xs font-light text-gray-500 hover:text-charcoal transition-colors duration-200 uppercase tracking-wide"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
    
    // Log error for monitoring
    const errorData = {
      type: 'unknown' as const,
      message: error.message,
      userMessage: 'Something went wrong. Please refresh the page.',
      retryable: true,
      severity: 'high' as const,
      timestamp: new Date(),
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    };
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to error monitoring service
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">😔</div>
            <h1 className="text-2xl font-light text-charcoal mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 font-light mb-8 leading-relaxed">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full py-3 bg-charcoal text-white hover:bg-charcoal-light transition-colors duration-200 font-medium uppercase tracking-wide text-sm"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 border border-gray-300 text-gray-600 hover:border-charcoal hover:text-charcoal transition-colors duration-200 font-light uppercase tracking-wide text-sm"
              >
                Refresh Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer font-medium">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-gray-400 mt-2 p-3 bg-gray-50 overflow-auto font-mono">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface NetworkErrorProps {
  isOnline: boolean;
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ isOnline, onRetry, className = '' }: NetworkErrorProps) {
  if (isOnline) return null;

  return (
    <div className={`bg-gray-50 border border-gray-200 p-4 text-center ${className}`}>
      <div className="text-2xl mb-2">📡</div>
      <p className="text-sm font-medium text-charcoal mb-1">
        No Internet Connection
      </p>
      <p className="text-xs text-gray-600 font-light mb-3">
        Please check your connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-medium text-charcoal border border-charcoal hover:bg-charcoal hover:text-white transition-colors duration-200 uppercase tracking-wide"
        >
          Retry
        </button>
      )}
    </div>
  );
}