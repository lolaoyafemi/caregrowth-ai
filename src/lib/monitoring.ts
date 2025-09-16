// Performance and error monitoring utilities

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorReport[] = [];
  private maxMetrics = 100;
  private maxErrors = 50;

  // Performance monitoring
  measurePageLoad() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
      this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
      this.recordMetric('first_paint', this.getFirstPaint());
      this.recordMetric('largest_contentful_paint', this.getLCP());
    });
  }

  measureApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    return apiCall()
      .then(result => {
        const duration = performance.now() - startTime;
        this.recordMetric(`api_call_${endpoint}`, duration, {
          success: true,
          ...metadata
        });
        return result;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.recordMetric(`api_call_${endpoint}`, duration, {
          success: false,
          error: error.message,
          ...metadata
        });
        throw error;
      });
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (name.includes('api_call') && value > 5000) {
      console.warn(`Slow API call detected: ${name} took ${value}ms`);
    }

    // Store critical metrics in localStorage for persistence
    if (this.isCriticalMetric(name)) {
      this.persistMetric(metric);
    }
  }

  recordError(error: Error, metadata?: Record<string, any>) {
    const errorReport: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata
    };

    this.errors.push(errorReport);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Persist critical errors
    this.persistError(errorReport);

    console.error('Error recorded:', errorReport);
  }

  getMetrics(filter?: string): PerformanceMetric[] {
    if (!filter) return [...this.metrics];
    return this.metrics.filter(metric => metric.name.includes(filter));
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  // Core Web Vitals
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  private getLCP(): number {
    return new Promise(resolve => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    }) as any;
  }

  // Persistence
  private isCriticalMetric(name: string): boolean {
    const criticalMetrics = [
      'page_load_time',
      'largest_contentful_paint',
      'first_paint',
      'api_call_login',
      'api_call_payment'
    ];
    return criticalMetrics.some(critical => name.includes(critical));
  }

  private persistMetric(metric: PerformanceMetric) {
    try {
      const stored = JSON.parse(localStorage.getItem('app_metrics') || '[]');
      stored.push(metric);
      
      // Keep only last 50 metrics
      if (stored.length > 50) {
        stored.splice(0, stored.length - 50);
      }
      
      localStorage.setItem('app_metrics', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to persist metric:', error);
    }
  }

  private persistError(error: ErrorReport) {
    try {
      const stored = JSON.parse(localStorage.getItem('app_errors') || '[]');
      stored.push(error);
      
      // Keep only last 20 errors
      if (stored.length > 20) {
        stored.splice(0, stored.length - 20);
      }
      
      localStorage.setItem('app_errors', JSON.stringify(stored));
    } catch (err) {
      console.warn('Failed to persist error:', err);
    }
  }

  // Health check
  getHealthStatus() {
    const recentMetrics = this.metrics.filter(
      metric => Date.now() - metric.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    const recentErrors = this.errors.filter(
      error => Date.now() - error.timestamp < 5 * 60 * 1000
    );

    const avgApiTime = recentMetrics
      .filter(metric => metric.name.includes('api_call'))
      .reduce((sum, metric, _, arr) => sum + metric.value / arr.length, 0);

    return {
      status: recentErrors.length > 5 ? 'unhealthy' : avgApiTime > 3000 ? 'slow' : 'healthy',
      metrics: {
        errorCount: recentErrors.length,
        avgApiResponseTime: avgApiTime,
        totalMetrics: recentMetrics.length
      },
      timestamp: Date.now()
    };
  }
}

// Global monitoring instance
export const monitoring = new MonitoringService();

// Initialize monitoring
if (typeof window !== 'undefined') {
  monitoring.measurePageLoad();

  // Monitor unhandled errors
  window.addEventListener('error', (event) => {
    monitoring.recordError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Monitor unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    monitoring.recordError(new Error(event.reason), {
      type: 'unhandled_promise_rejection'
    });
  });
}

// Performance monitoring utilities
export const recordApiMetric = monitoring.recordMetric.bind(monitoring);
export const trackError = monitoring.recordError.bind(monitoring);

export const monitorApiCall = monitoring.measureApiCall.bind(monitoring);
export const recordMetric = monitoring.recordMetric.bind(monitoring);
export const recordError = monitoring.recordError.bind(monitoring);
