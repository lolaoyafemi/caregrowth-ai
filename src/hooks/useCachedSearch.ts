import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CachedSearchResult {
  query: string;
  result: any;
  timestamp: number;
  userId: string;
}

interface SearchMetrics {
  totalSearches: number;
  cacheHits: number;
  averageResponseTime: number;
  lastSearchTime?: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 50;
const DEBOUNCE_DELAY = 300; // 300ms debounce

export const useCachedSearch = () => {
  const { user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SearchMetrics>({
    totalSearches: 0,
    cacheHits: 0,
    averageResponseTime: 0
  });
  
  // Cache management
  const searchCache = useRef<Map<string, CachedSearchResult>>(new Map());
  const searchQueue = useRef<Map<string, Promise<any>>>(new Map());
  const debounceTimer = useRef<NodeJS.Timeout>();
  const responseTimes = useRef<number[]>([]);

  // Initialize cache from localStorage
  useEffect(() => {
    if (user) {
      const cachedData = localStorage.getItem(`search-cache-${user.id}`);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const now = Date.now();
          
          // Load non-expired cache entries
          Object.entries(parsed).forEach(([key, value]: [string, any]) => {
            if (now - value.timestamp < CACHE_DURATION) {
              searchCache.current.set(key, value);
            }
          });
        } catch (error) {
          console.error('Failed to load search cache:', error);
        }
      }
    }
  }, [user]);

  // Save cache to localStorage
  const saveCache = useCallback(() => {
    if (user && searchCache.current.size > 0) {
      const cacheObject = Object.fromEntries(searchCache.current.entries());
      try {
        localStorage.setItem(`search-cache-${user.id}`, JSON.stringify(cacheObject));
      } catch (error) {
        console.error('Failed to save search cache:', error);
      }
    }
  }, [user]);

  // Clean expired cache entries
  const cleanCache = useCallback(() => {
    const now = Date.now();
    let cleanedEntries = 0;
    
    for (const [key, entry] of searchCache.current.entries()) {
      if (now - entry.timestamp > CACHE_DURATION) {
        searchCache.current.delete(key);
        cleanedEntries++;
      }
    }
    
    // If cache is still too large, remove oldest entries
    if (searchCache.current.size > MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(searchCache.current.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToRemove = searchCache.current.size - MAX_CACHE_SIZE;
      for (let i = 0; i < entriesToRemove; i++) {
        searchCache.current.delete(sortedEntries[i][0]);
        cleanedEntries++;
      }
    }
    
    if (cleanedEntries > 0) {
      console.log(`Cleaned ${cleanedEntries} expired cache entries`);
      saveCache();
    }
  }, [saveCache]);

  // Generate cache key
  const getCacheKey = useCallback((query: string, searchType: string = 'basic'): string => {
    return `${searchType}:${query.toLowerCase().trim()}`;
  }, []);

  // Update metrics
  const updateMetrics = useCallback((responseTime: number, wasCacheHit: boolean) => {
    responseTimes.current.push(responseTime);
    if (responseTimes.current.length > 20) {
      responseTimes.current.shift(); // Keep only last 20 response times
    }

    setMetrics(prev => ({
      totalSearches: prev.totalSearches + 1,
      cacheHits: prev.cacheHits + (wasCacheHit ? 1 : 0),
      averageResponseTime: responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length,
      lastSearchTime: Date.now()
    }));
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((
    searchFn: () => Promise<any>, 
    query: string, 
    searchType: string = 'basic'
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        try {
          const result = await searchFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, DEBOUNCE_DELAY);
    });
  }, []);

  // Main search function with caching
  const performCachedSearch = useCallback(async (
    query: string,
    searchFunction: () => Promise<any>,
    searchType: string = 'basic',
    useDebounce: boolean = true
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const cacheKey = getCacheKey(query, searchType);
    const startTime = Date.now();

    // Clean cache periodically
    cleanCache();

    // Check cache first
    const cachedResult = searchCache.current.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_DURATION)) {
      console.log('Cache hit for query:', query);
      const responseTime = Date.now() - startTime;
      updateMetrics(responseTime, true);
      return cachedResult.result;
    }

    // Check if this query is already being processed
    if (searchQueue.current.has(cacheKey)) {
      console.log('Query already in progress, waiting for result:', query);
      return searchQueue.current.get(cacheKey);
    }

    // Create search promise
    const searchPromise = (async () => {
      try {
        setIsSearching(true);
        setError(null);

        let searchFn = searchFunction;
        if (useDebounce) {
          searchFn = () => debouncedSearch(searchFunction, query, searchType);
        }

        const result = await searchFn();
        const responseTime = Date.now() - startTime;

        // Cache the result
        const cacheEntry: CachedSearchResult = {
          query,
          result,
          timestamp: Date.now(),
          userId: user.id
        };
        
        searchCache.current.set(cacheKey, cacheEntry);
        saveCache();

        console.log(`Search completed in ${responseTime}ms for query:`, query);
        updateMetrics(responseTime, false);

        return result;
      } catch (error) {
        console.error('Search error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Search failed';
        setError(errorMessage);
        throw error;
      } finally {
        setIsSearching(false);
        searchQueue.current.delete(cacheKey);
      }
    })();

    // Add to queue
    searchQueue.current.set(cacheKey, searchPromise);
    return searchPromise;
  }, [user, getCacheKey, cleanCache, saveCache, updateMetrics, debouncedSearch]);

  // Smart search with caching
  const smartSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }

    return performCachedSearch(
      query,
      async () => {
        const { data, error } = await supabase.functions.invoke('smart-document-search-v2', {
          body: { query: query.trim() }
        });

        if (error) {
          throw new Error(error.message || 'Smart search failed');
        }

        return data;
      },
      'smart',
      true
    );
  }, [performCachedSearch]);

  // Basic search with caching
  const basicSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }

    return performCachedSearch(
      query,
      async () => {
        const { data, error } = await supabase.functions.invoke('document-search', {
          body: { query: query.trim() }
        });

        if (error) {
          throw new Error(error.message || 'Basic search failed');
        }

        return data;
      },
      'basic',
      true
    );
  }, [performCachedSearch]);

  // Clear cache
  const clearCache = useCallback(() => {
    searchCache.current.clear();
    if (user) {
      localStorage.removeItem(`search-cache-${user.id}`);
    }
    toast.success('Search cache cleared');
  }, [user]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      cacheSize: searchCache.current.size,
      maxCacheSize: MAX_CACHE_SIZE,
      cacheDuration: CACHE_DURATION,
      metrics
    };
  }, [metrics]);

  // Cancel ongoing searches
  const cancelSearches = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    searchQueue.current.clear();
    setIsSearching(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      saveCache();
    };
  }, [saveCache]);

  return {
    smartSearch,
    basicSearch,
    isSearching,
    error,
    clearCache,
    getCacheStats,
    cancelSearches,
    metrics
  };
};