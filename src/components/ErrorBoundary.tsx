import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string; // Add context prop to identify where the error occurred
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  componentStack: string;
}

/**
 * Enhanced Error Boundary component to catch JavaScript errors in child component trees,
 * log those errors, and display a fallback UI instead of crashing the whole app.
 * Provides detailed error information for debugging.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      componentStack: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Extract component stack from errorInfo
    const componentStack = errorInfo?.componentStack || '';
    
    // Log detailed error information
    console.group('ErrorBoundary Caught Error');
    console.error('Error:', error);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', componentStack);
    
    // Check for common error patterns
    if (error.message.includes('Cannot access')) {
      console.info('Possible initialization order issue detected.');
    }
    
    if (error.message.includes('is not a function')) {
      console.info('Possible function or method call on undefined.');
    }
    
    console.groupEnd();
    
    // Update state with error info
    this.setState({
      errorInfo,
      componentStack
    });
  }

  renderErrorDetails() {
    const { error, componentStack } = this.state;
    if (!error) return null;

    return (
      <div className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-60">
        <h3 className="font-bold mb-2">Error Details:</h3>
        <div className="mb-2">
          <span className="font-semibold">Message:</span> {error.message}
        </div>
        {error.stack && (
          <div className="mb-2">
            <span className="font-semibold">Stack:</span>
            <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
          </div>
        )}
        {componentStack && (
          <div>
            <span className="font-semibold">Component Stack:</span>
            <pre className="whitespace-pre-wrap mt-1">{componentStack}</pre>
          </div>
        )}
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback UI or default one
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-2xl w-full p-6 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-3">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-700 mb-4">
                {this.props.context || 'The application encountered an unexpected error.'}
              </p>
              
              {/* Show error details in development */}
              {process.env.NODE_ENV === 'development' && this.renderErrorDetails()}
              
              <div className="mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mr-3"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      window.location.href = '/';
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Go Back
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                If the problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
