// Performance optimization utilities

import React from 'react';
import { logger } from './logger';

// Component performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const WrappedComponent = React.memo((props: P) => {
    const renderStart = performance.now();
    
    React.useEffect(() => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      if (renderTime > 100) {
        logger.warn(`Slow component render: ${componentName}`, { renderTime });
      }
    });

    return React.createElement(Component, props);
  });

  return WrappedComponent;
};

// Intersection Observer for lazy loading
export const useLazyLoad = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { elementRef, isVisible };
};

// Debounce hook for performance
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Memory usage monitoring
export const useMemoryMonitoring = () => {
  React.useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
        
        if (usage > 0.9) {
          logger.warn('High memory usage detected', {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            percentage: Math.round(usage * 100)
          });
        }
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);
};

// Bundle size analyzer
export const bundleAnalyzer = {
  logLargeComponents: () => {
    if (process.env.NODE_ENV === 'development') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.duration > 100) {
            logger.warn('Large bundle detected', {
              name: entry.name,
              duration: entry.duration
            });
          }
        }
      });
      observer.observe({ entryTypes: ['measure'] });
    }
  }
};

// Image optimization helper
export const optimizeImage = (src: string, width?: number, quality = 80): string => {
  // Add image optimization parameters
  if (src.includes('supabase.co') || src.includes('cloudinary.com')) {
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    params.set('q', quality.toString());
    params.set('f', 'auto');
    
    return `${src}?${params.toString()}`;
  }
  
  return src;
};

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload fonts
  const fonts = [
    '/fonts/inter-var.woff2',
  ];

  fonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = font;
    document.head.appendChild(link);
  });

  // Preload critical API endpoints
  const criticalEndpoints = [
    '/api/user/profile',
    '/api/user/credits',
  ];

  criticalEndpoints.forEach(endpoint => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = endpoint;
    document.head.appendChild(link);
  });
};