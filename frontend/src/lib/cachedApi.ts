/**
 * Cached API functions
 * These wrap the base API calls with caching for better performance
 */

import { categoryAPI, productAPI, reviewAPI } from './api';
import { apiCache, cacheKeys, APICache } from './cache';

// Cached category functions
export const cachedCategoryAPI = {
  getAll: async () => {
    return apiCache.get(
      cacheKeys.categories(),
      async () => {
        const response = await categoryAPI.getAll();
        return response.data;
      },
      { ttl: APICache.TTL.LONG, staleWhileRevalidate: true }
    );
  },

  getBySlug: async (slug: string) => {
    return apiCache.get(
      cacheKeys.category(slug),
      async () => {
        const response = await categoryAPI.getBySlug(slug);
        return response.data;
      },
      { ttl: APICache.TTL.LONG, staleWhileRevalidate: true }
    );
  },

  // Invalidate categories cache (call after create/update/delete)
  invalidate: () => {
    apiCache.invalidatePattern(/^categor/);
  },
};

// Cached product functions
export const cachedProductAPI = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }) => {
    // Don't cache search queries for long
    const ttl = params?.search ? APICache.TTL.SHORT : APICache.TTL.MEDIUM;
    
    return apiCache.get(
      cacheKeys.products(params),
      async () => {
        const response = await productAPI.getAll(params);
        return response.data;
      },
      { ttl, staleWhileRevalidate: !params?.search }
    );
  },

  getBySlug: async (slug: string) => {
    return apiCache.get(
      cacheKeys.product(slug),
      async () => {
        const response = await productAPI.getBySlug(slug);
        return response.data;
      },
      { ttl: APICache.TTL.MEDIUM, staleWhileRevalidate: true }
    );
  },

  getById: async (id: string) => {
    return apiCache.get(
      cacheKeys.productById(id),
      async () => {
        const response = await productAPI.getById(id);
        return response.data;
      },
      { ttl: APICache.TTL.MEDIUM, staleWhileRevalidate: true }
    );
  },

  getFeatured: async () => {
    return apiCache.get(
      cacheKeys.featuredProducts(),
      async () => {
        const response = await productAPI.getFeatured();
        return response.data;
      },
      { ttl: APICache.TTL.LONG, staleWhileRevalidate: true }
    );
  },

  // Invalidate products cache (call after create/update/delete)
  invalidate: (id?: string) => {
    if (id) {
      apiCache.invalidate(cacheKeys.productById(id));
    }
    apiCache.invalidatePattern(/^product/);
    apiCache.invalidate(cacheKeys.featuredProducts());
  },
};

// Cached review functions
export const cachedReviewAPI = {
  getByProduct: async (productId: string, params?: { page?: number; limit?: number }) => {
    return apiCache.get(
      cacheKeys.reviews(productId, params),
      async () => {
        const response = await reviewAPI.getByProduct(productId, params);
        return response.data;
      },
      { ttl: APICache.TTL.SHORT, staleWhileRevalidate: true }
    );
  },

  // Invalidate reviews cache for a product
  invalidate: (productId: string) => {
    apiCache.invalidatePattern(new RegExp(`^reviews:${productId}`));
  },
};

// Utility to prefetch common data
export const prefetchCommonData = async () => {
  // Prefetch categories in background
  cachedCategoryAPI.getAll().catch(console.error);
  
  // Prefetch featured products in background  
  cachedProductAPI.getFeatured().catch(console.error);
};

// Clear all caches (useful on logout or major state changes)
export const clearAllCaches = () => {
  apiCache.clear();
};

export default {
  categories: cachedCategoryAPI,
  products: cachedProductAPI,
  reviews: cachedReviewAPI,
  prefetch: prefetchCommonData,
  clearAll: clearAllCaches,
};
