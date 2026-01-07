/**
 * Cache service with Redis primary and in-memory fallback.
 * API remains promise-based to allow async Redis operations.
 */
const { redisClient, isRedisEnabled, prefixKey } = require('../config/redis');
const { CACHE_TTL } = require('../constants');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    // Clean up expired local entries every minute (fallback only)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get(key) {
    if (isRedisEnabled() && redisClient) {
      try {
        const raw = await redisClient.get(prefixKey(key));
        if (!raw) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        return JSON.parse(raw);
      } catch (err) {
        console.error('[Cache] Redis get failed', err.message);
      }
    }

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  async set(key, data, ttlSeconds = CACHE_TTL.PRODUCTS_LIST) {
    if (isRedisEnabled() && redisClient) {
      try {
        await redisClient.set(prefixKey(key), JSON.stringify(data), { EX: ttlSeconds });
        this.stats.sets++;
        return;
      } catch (err) {
        console.error('[Cache] Redis set failed', err.message);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      createdAt: Date.now(),
    });
    this.stats.sets++;
  }

  async delete(key) {
    if (isRedisEnabled() && redisClient) {
      try {
        const deleted = await redisClient.del(prefixKey(key));
        if (deleted) this.stats.deletes++;
        return Boolean(deleted);
      } catch (err) {
        console.error('[Cache] Redis delete failed', err.message);
      }
    }

    const deleted = this.cache.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }

  async deletePattern(pattern) {
    const toGlob = () => {
      if (typeof pattern === 'string') return `${prefixKey(pattern)}*`;
      if (pattern instanceof RegExp) {
        let glob = pattern.source.replace(/^\^/, '').replace(/\$$/, '');
        glob = glob.replace(/\.\*/g, '*').replace(/\.\+/g, '*').replace(/\.\?/g, '*');
        if (!glob.endsWith('*')) glob = `${glob}*`;
        return `${prefixKey(glob)}`;
      }
      return null;
    };

    if (isRedisEnabled() && redisClient) {
      const match = toGlob();
      if (match) {
        try {
          let cursor = '0';
          let total = 0;
          do {
            const res = await redisClient.scan(cursor, { MATCH: match, COUNT: 100 });
            cursor = res.cursor;
            const keys = res.keys || [];
            if (keys.length) {
              total += keys.length;
              await redisClient.del(keys);
            }
          } while (cursor !== '0');
          this.stats.deletes += total;
          return total;
        } catch (err) {
          console.error('[Cache] Redis deletePattern failed', err.message);
        }
      }
    }

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.deletes += count;
    return count;
  }

  async has(key) {
    if (isRedisEnabled() && redisClient) {
      try {
        const exists = await redisClient.exists(prefixKey(key));
        return exists === 1;
      } catch (err) {
        console.error('[Cache] Redis exists failed', err.message);
      }
    }

    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async getOrSet(key, fetcher, ttlSeconds = CACHE_TTL.PRODUCTS_LIST) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? `${((this.stats.hits / total) * 100).toFixed(2)}%` : '0%',
      size: this.cache.size,
      redis: isRedisEnabled(),
    };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Cache key generators
const cacheKeys = {
  categories: () => 'categories:all',
  category: (slug) => `category:${slug}`,
  products: (params = {}) => {
    const parts = ['products'];
    if (params.category) parts.push(`cat:${params.category}`);
    if (params.page) parts.push(`p:${params.page}`);
    if (params.limit) parts.push(`l:${params.limit}`);
    if (params.sort) parts.push(`s:${params.sort}`);
    if (params.inStock) parts.push('instock');
    if (params.featured) parts.push('featured');
    if (params.source) parts.push(`src:${params.source}`);
    if (params.vendorId) parts.push(`v:${params.vendorId}`);
    return parts.join(':');
  },
  product: (slug) => `product:${slug}`,
  productById: (id) => `product:id:${id}`,
  featuredProducts: () => 'products:featured',
  vendorProducts: (vendorId, page = 1) => `vendor:${vendorId}:products:${page}`,
  distance: (lat1, lng1, lat2, lng2) => {
    const r = (n) => Math.round(n * 10000) / 10000;
    return `distance:${r(lat1)},${r(lng1)}->${r(lat2)},${r(lng2)}`;
  },
  userCart: (userId) => `cart:${userId}`,
  orderCount: (dateStr) => `orders:count:${dateStr}`,
};

// Create singleton instance
const cacheService = new CacheService();

module.exports = {
  cacheService,
  cacheKeys,
  CacheService,
  CACHE_TTL,
};
