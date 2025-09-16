// Enhanced caching utilities for scalability

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry?: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expiry = ttlMs ? Date.now() + ttlMs : undefined;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const globalCache = new MemoryCache(200);

// Cache key generators
export const cacheKeys = {
  userCredits: (userId: string) => `user_credits_${userId}`,
  userProfile: (userId: string) => `user_profile_${userId}`,
  creditUsage: (userId: string, month: string) => `credit_usage_${userId}_${month}`,
  supportTickets: (userId: string) => `support_tickets_${userId}`,
  adminMetrics: () => 'admin_metrics',
  documentSearch: (query: string, userId: string) => `doc_search_${userId}_${btoa(query).slice(0, 20)}`,
};

// Cached data fetcher with invalidation
export const withCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 5 * 60 * 1000 // 5 minutes default
): Promise<T> => {
  const cached = globalCache.get<T>(key);
  if (cached) {
    return cached;
  }

  const data = await fetcher();
  globalCache.set(key, data, ttlMs);
  return data;
};

// Cache invalidation patterns
export const invalidateCache = {
  userCredits: (userId: string) => {
    globalCache.delete(cacheKeys.userCredits(userId));
    globalCache.delete(cacheKeys.userProfile(userId));
    
    // Invalidate monthly usage cache for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    globalCache.delete(cacheKeys.creditUsage(userId, currentMonth));
  },
  
  userProfile: (userId: string) => {
    globalCache.delete(cacheKeys.userProfile(userId));
    globalCache.delete(cacheKeys.userCredits(userId));
  },
  
  adminData: () => {
    globalCache.delete(cacheKeys.adminMetrics());
  },
  
  all: () => {
    globalCache.clear();
  }
};

// Browser storage cache for persistence across sessions
export class PersistentCache {
  private prefix: string;

  constructor(prefix = 'app_cache_') {
    this.prefix = prefix;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: ttlMs ? Date.now() + ttlMs : undefined
    };

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;

      const item: CacheItem<T> = JSON.parse(stored);
      
      if (item.expiry && Date.now() > item.expiry) {
        this.delete(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

export const persistentCache = new PersistentCache();