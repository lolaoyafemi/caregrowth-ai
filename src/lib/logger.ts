// Production-safe logging utility with proper filtering

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  userId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Remove sensitive information
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'access_token', 'refresh_token', 'api_key', 'private_key'
    ];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      Object.keys(sanitized).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      });
      return sanitized;
    }
    
    return data;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
    };

    // Add to buffer for debugging
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Console output in development or for critical issues
    if (this.isDevelopment || level === 'error') {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](`[${level.toUpperCase()}] ${message}`, data || '');
    }

    // In production, send critical errors to monitoring service
    if (!this.isDevelopment && level === 'error') {
      this.reportError(entry);
    }
  }

  private async reportError(entry: LogEntry): Promise<void> {
    try {
      // Send to monitoring service or analytics
      // This could be integrated with services like Sentry, LogRocket, etc.
      if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
        const payload = JSON.stringify({
          ...entry,
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
        
        // Send to error tracking endpoint (implement as needed)
        navigator.sendBeacon('/api/errors', payload);
      }
    } catch (error) {
      // Fail silently to avoid infinite loops
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  // Get recent logs for debugging
  getRecentLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Performance timing
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Group related logs
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

// Global logger instance
export const logger = new Logger();

// Convenience exports
export const { debug, info, warn, error } = logger;

// Performance monitoring helpers
export const perfLogger = {
  measure: (name: string, fn: () => any) => {
    const start = performance.now();
    try {
      const result = fn();
      const end = performance.now();
      
      if (end - start > 100) { // Log slow operations
        logger.warn(`Slow operation: ${name}`, { duration: end - start });
      }
      
      return result;
    } catch (err) {
      const end = performance.now();
      logger.error(`Failed operation: ${name}`, { 
        duration: end - start, 
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  },

  measureAsync: async (name: string, fn: () => Promise<any>) => {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      
      if (end - start > 1000) { // Log slow async operations
        logger.warn(`Slow async operation: ${name}`, { duration: end - start });
      }
      
      return result;
    } catch (err) {
      const end = performance.now();
      logger.error(`Failed async operation: ${name}`, { 
        duration: end - start, 
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }
};