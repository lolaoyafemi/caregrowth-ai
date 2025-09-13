import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console and any monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h3>
              <p className="text-sm text-gray-600">
                We encountered an unexpected error. This has been logged and our team will investigate.
              </p>
            </div>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left space-y-2">
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-red-600 font-mono whitespace-pre-wrap overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </div>
                </details>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              If this problem persists, please contact support with the error details above.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;