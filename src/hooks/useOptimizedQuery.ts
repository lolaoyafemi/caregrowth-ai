import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { withCache, globalCache } from '@/lib/cache';
import { handleAsyncError, withRetry } from '@/lib/errors';

interface QueryOptions {
  cacheKey?: string;
  cacheTTL?: number;
  enableRealtime?: boolean;
  retryAttempts?: number;
  dependencies?: any[];
  enabled?: boolean;
}

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  invalidate: () => void;
}

// Optimized data fetching hook with caching, error handling, and real-time updates
export const useOptimizedQuery = <T>(
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryResult<T> => {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    enableRealtime = false,
    retryAttempts = 2,
    dependencies = [],
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (useCache = true) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    const fetchFn = async () => {
      if (useCache && cacheKey) {
        return withCache(cacheKey, queryFn, cacheTTL);
      }
      return queryFn();
    };

    const { data: result, error: fetchError } = await handleAsyncError(
      () => withRetry(fetchFn, retryAttempts),
      `Query: ${cacheKey || 'unknown'}`
    );

    if (!mountedRef.current) return;

    if (fetchError) {
      setError(fetchError);
      setData(null);
    } else {
      setData(result);
    }

    setLoading(false);
  }, [queryFn, cacheKey, cacheTTL, retryAttempts, enabled, ...dependencies]);

  const refetch = useCallback(() => {
    fetchData(false); // Force fresh data
  }, [fetchData]);

  const invalidate = useCallback(() => {
    if (cacheKey) {
      globalCache.delete(cacheKey);
    }
    refetch();
  }, [cacheKey, refetch]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  };
};

// Specialized hook for Supabase queries with built-in optimizations
export const useSupabaseQuery = <T>(
  tableName: keyof Database['public']['Tables'],
  query: (builder: any) => any,
  options: QueryOptions & {
    realtimeEvent?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    realtimeFilter?: string;
  } = {}
) => {
  const {
    realtimeEvent = '*',
    realtimeFilter,
    enableRealtime = false,
    ...queryOptions
  } = options;

  const queryFn = useCallback(async () => {
    const { data, error } = await query(supabase.from(tableName));
    if (error) throw error;
    return data;
  }, [tableName, query]);

  const result = useOptimizedQuery<T>(queryFn, {
    cacheKey: queryOptions.cacheKey || `${tableName}_${JSON.stringify(query)}`,
    ...queryOptions
  });

  // Set up real-time subscription if enabled
  useEffect(() => {
    if (!enableRealtime || !result.data) return;

    const channel = supabase
      .channel(`${tableName}_realtime`)
      .on(
        'postgres_changes',
        {
          event: realtimeEvent as any,
          schema: 'public',
          table: tableName as string,
          filter: realtimeFilter
        } as any,
        () => {
          result.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, realtimeEvent, realtimeFilter, enableRealtime, result.data]);

  return result;
};

// Batch query hook for multiple related queries
export const useBatchQueries = <T extends Record<string, any>>(
  queries: Record<keyof T, () => Promise<any>>,
  options: Omit<QueryOptions, 'cacheKey'> & {
    cachePrefix?: string;
  } = {}
): {
  data: Partial<T>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} => {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled(
      Object.entries(queries).map(async ([key, queryFn]) => {
        const cacheKey = options.cachePrefix ? `${options.cachePrefix}_${key}` : undefined;
        const result = cacheKey 
          ? await withCache(cacheKey, queryFn, options.cacheTTL)
          : await queryFn();
        return { key, result };
      })
    );

    const newData: Partial<T> = {};
    let hasError = false;

    results.forEach((result, index) => {
      const key = Object.keys(queries)[index] as keyof T;
      
      if (result.status === 'fulfilled') {
        newData[key] = result.value.result;
      } else {
        hasError = true;
        console.error(`Query ${String(key)} failed:`, result.reason);
      }
    });

    setData(newData);
    if (hasError) {
      setError('Some queries failed to load');
    }
    setLoading(false);
  }, [queries, options.cachePrefix, options.cacheTTL]);

  const refetch = useCallback(() => {
    fetchBatch();
  }, [fetchBatch]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchBatch();
    }
  }, [fetchBatch, options.enabled, ...(options.dependencies || [])]);

  return { data, loading, error, refetch };
};