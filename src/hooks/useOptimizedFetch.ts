// Optimized data fetching with enhanced caching and error handling

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { globalCache, cacheKeys } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { rateLimiter } from '@/lib/security-hardening';

interface FetchOptions {
  cacheKey?: string;
  cacheTTL?: number;
  retries?: number;
  timeout?: number;
  dependencies?: any[];
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  refresh: () => void;
}

export const useOptimizedFetch = <T>(
  fetchFn: () => Promise<T>,
  options: FetchOptions = {}
): FetchResult<T> => {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retries = 2,
    timeout = 10000, // 10 seconds
    dependencies = [],
    enabled = true,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // Optimized fetch function with retry logic
  const performFetch = useCallback(async (useCache = true): Promise<void> => {
    if (!enabled || !mountedRef.current) return;

    // Check rate limiting
    if (cacheKey && !rateLimiter.canMakeRequest(`fetch_${cacheKey}`)) {
      setError('Rate limit exceeded. Please try again later.');
      setLoading(false);
      return;
    }

    // Check cache first
    if (useCache && cacheKey) {
      const cached = globalCache.get<T>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      const fetchPromise = fetchFn();
      const result = await Promise.race([fetchPromise, timeoutPromise]);

      if (!mountedRef.current) return;

      setData(result);
      setError(null);
      retryCountRef.current = 0;

      // Cache the result
      if (cacheKey) {
        globalCache.set(cacheKey, result, cacheTTL);
      }

      onSuccess?.(result);
      logger.debug('Fetch completed successfully', { cacheKey });

    } catch (err: any) {
      if (!mountedRef.current) return;

      const errorMessage = err.message || 'An error occurred';
      
      // Retry logic
      if (retryCountRef.current < retries && err.name !== 'AbortError') {
        retryCountRef.current++;
        logger.warn(`Fetch retry ${retryCountRef.current}/${retries}`, { cacheKey, error: errorMessage });
        
        // Exponential backoff
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => {
          if (mountedRef.current) {
            performFetch(false);
          }
        }, delay);
        return;
      }

      setError(errorMessage);
      setData(null);
      onError?.(errorMessage);
      logger.error('Fetch failed after retries', { cacheKey, error: errorMessage, retries: retryCountRef.current });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn, cacheKey, cacheTTL, retries, timeout, enabled, onSuccess, onError, ...dependencies]);

  // Refetch function (uses cache)
  const refetch = useCallback(() => {
    retryCountRef.current = 0;
    performFetch(true);
  }, [performFetch]);

  // Refresh function (bypasses cache)
  const refresh = useCallback(() => {
    if (cacheKey) {
      globalCache.delete(cacheKey);
    }
    retryCountRef.current = 0;
    performFetch(false);
  }, [performFetch, cacheKey]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    performFetch();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [performFetch]);

  return {
    data,
    loading,
    error,
    refetch,
    refresh
  };
};

// Specialized hook for Supabase queries
export const useSupabaseFetch = <T>(
  tableName: string,
  selectQuery = '*',
  options: FetchOptions = {}
) => {
  const fetchFn = useCallback(async (): Promise<T> => {
    const { data, error } = await supabase
      .from(tableName as any)
      .select(selectQuery);
    
    if (error) {
      throw new Error(error.message);
    }

    return data as T;
  }, [tableName, selectQuery]);

  return useOptimizedFetch<T>(fetchFn, {
    cacheKey: options.cacheKey || `${tableName}_${selectQuery}`,
    ...options
  });
};

// Multi-fetch hook for parallel requests
export const useMultiFetch = <T extends Record<string, any>>(
  requests: Record<keyof T, () => Promise<any>>,
  options: Omit<FetchOptions, 'cacheKey'> = {}
): FetchResult<Partial<T>> => {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (useCache = true) => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        Object.entries(requests).map(async ([key, fetchFn]) => {
          // Check cache for each request
          const cacheKey = `multi_${key}`;
          
          if (useCache) {
            const cached = globalCache.get(cacheKey);
            if (cached) {
              return { key, data: cached };
            }
          }

          const result = await fetchFn();
          globalCache.set(cacheKey, result, options.cacheTTL || 5 * 60 * 1000);
          return { key, data: result };
        })
      );

      const newData: Partial<T> = {};
      let hasError = false;

      results.forEach((result, index) => {
        const key = Object.keys(requests)[index] as keyof T;
        
        if (result.status === 'fulfilled') {
          newData[key] = result.value.data;
        } else {
          hasError = true;
          logger.error(`Multi-fetch failed for ${String(key)}`, result.reason);
        }
      });

      setData(newData);
      if (hasError) {
        setError('Some requests failed');
      }
    } catch (err: any) {
      setError(err.message || 'Multi-fetch failed');
      logger.error('Multi-fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [requests, options.cacheTTL]);

  const refetch = useCallback(() => fetchAll(true), [fetchAll]);
  const refresh = useCallback(() => {
    // Clear all caches for this multi-fetch
    Object.keys(requests).forEach(key => {
      globalCache.delete(`multi_${key}`);
    });
    fetchAll(false);
  }, [fetchAll, requests]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchAll();
    }
  }, [fetchAll, options.enabled, ...(options.dependencies || [])]);

  return {
    data,
    loading,
    error,
    refetch,
    refresh
  };
};