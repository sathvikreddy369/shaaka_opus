/**
 * Simple cache utility for API responses
 * Implements a TTL-based cache with stale-while-revalidate pattern
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
}

class APICache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  // Default TTL values (in milliseconds)
  static readonly TTL = {
    SHORT: 30 * 1000,      // 30 seconds - for frequently changing data
    MEDIUM: 2 * 60 * 1000, // 2 minutes - for semi-static data
    LONG: 10 * 60 * 1000,  // 10 minutes - for rarely changing data
    VERY_LONG: 30 * 60 * 1000, // 30 minutes - for static data
  };

  /**
   * Get data from cache or fetch if not available/stale
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = { ttl: APICache.TTL.MEDIUM }
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;

    // If we have valid cached data, return it
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // If we have stale data and staleWhileRevalidate is enabled
    if (cached && options.staleWhileRevalidate) {
      // Start revalidation in background
      this.revalidate(key, fetcher, options);
      return cached.data;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Fetch fresh data
    const fetchPromise = this.fetchAndCache(key, fetcher, options);
    this.pendingRequests.set(key, fetchPromise);

    try {
      const data = await fetchPromise;
      return data;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Fetch data and store in cache
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const data = await fetcher();
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + options.ttl,
    });

    return data;
  }

  /**
   * Revalidate cache in background
   */
  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    // Avoid duplicate revalidation requests
    if (this.pendingRequests.has(key)) return;

    const fetchPromise = this.fetchAndCache(key, fetcher, options);
    this.pendingRequests.set(key, fetchPromise);

    try {
      await fetchPromise;
    } catch (error) {
      console.error(`Failed to revalidate cache for key: ${key}`, error);
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Manually set cache data
   */
  set<T>(key: string, data: T, ttl: number = APICache.TTL.MEDIUM): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    return cached !== undefined && cached.expiresAt > Date.now();
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; keys: string[] } {
    const keys: string[] = [];
    this.cache.forEach((_, key) => keys.push(key));
    return {
      size: this.cache.size,
      keys,
    };
  }
}

// Singleton instance
export const apiCache = new APICache();

// Export the class for type access
export { APICache };

// Cache key generators for consistency
export const cacheKeys = {
  categories: () => 'categories',
  category: (slug: string) => `category:${slug}`,
  products: (params?: Record<string, unknown>) => 
    `products:${params ? JSON.stringify(params) : 'all'}`,
  product: (slug: string) => `product:${slug}`,
  productById: (id: string) => `productById:${id}`,
  featuredProducts: () => 'featuredProducts',
  cart: () => 'cart',
  wishlist: () => 'wishlist',
  userProfile: () => 'userProfile',
  addresses: () => 'addresses',
  orders: (params?: Record<string, unknown>) =>
    `orders:${params ? JSON.stringify(params) : 'all'}`,
  order: (id: string) => `order:${id}`,
  reviews: (productId: string, params?: Record<string, unknown>) =>
    `reviews:${productId}:${params ? JSON.stringify(params) : 'all'}`,
};

export default apiCache;
