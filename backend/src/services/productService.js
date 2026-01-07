/**
 * Product Service Layer
 * Centralizes product-related business logic with caching
 */

const mongoose = require('mongoose');
const { Product, Category, Vendor } = require('../models');
const { cacheService, cacheKeys, CACHE_TTL } = require('./cacheService');
const { PAGINATION, SORT_OPTIONS, PRODUCT_SOURCE } = require('../constants');

class ProductService {
  /**
   * Get products with filters, pagination, and caching
   */
  async getProducts(params = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      category,
      search,
      minPrice,
      maxPrice,
      inStock,
      featured,
      sort = 'newest',
      source,
      vendorId,
    } = params;

    // Don't cache search queries
    const shouldCache = !search;
    const cacheKey = shouldCache ? cacheKeys.products(params) : null;

    if (shouldCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    // Build filter
    const filter = { isActive: true };

    if (source === 'ADMIN') {
      filter.source = PRODUCT_SOURCE.ADMIN;
    } else if (source === 'VENDOR') {
      filter.source = PRODUCT_SOURCE.VENDOR;
    }

    if (vendorId) {
      filter.vendor = vendorId;
      filter.source = PRODUCT_SOURCE.VENDOR;
    }

    if (category) {
      const categoryDoc = await this.getCategoryBySlug(category);
      if (categoryDoc) {
        filter.category = categoryDoc._id;
      }
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (minPrice || maxPrice) {
      filter.minPrice = {};
      if (minPrice) filter.minPrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.minPrice.$lte = parseFloat(maxPrice);
    }

    if (inStock === 'true' || inStock === true) {
      filter.isOutOfStock = false;
    }

    if (featured === 'true' || featured === true) {
      filter.isFeatured = true;
    }

    // Build sort
    const sortObj = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute queries in parallel
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('vendor', 'businessName address.coordinates ratings')
        .select('-__v')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Use lean() for read-only operations
      Product.countDocuments(filter),
    ]);

    const result = {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1,
      },
    };

    if (shouldCache) {
      await cacheService.set(cacheKey, result, CACHE_TTL.PRODUCTS_LIST);
    }

    return result;
  }

  /**
   * Get featured products with caching
   */
  async getFeaturedProducts(limit = 8) {
    const cacheKey = cacheKeys.featuredProducts();
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const products = await Product.find({ isActive: true, isFeatured: true })
          .populate('category', 'name slug')
          .select('-__v')
          .sort({ totalSales: -1 })
          .limit(limit)
          .lean();
        
        return { products };
      },
      CACHE_TTL.FEATURED_PRODUCTS
    );
  }

  /**
   * Get single product by slug with caching
   */
  async getProductBySlug(slug) {
    const cacheKey = cacheKeys.product(slug);
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const product = await Product.findOne({ slug, isActive: true })
          .populate('category', 'name slug')
          .populate('vendor', 'businessName address ratings operatingHours isAcceptingOrders deliveryRadius')
          .lean();
        
        return product;
      },
      CACHE_TTL.PRODUCT_DETAIL
    );
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    const cacheKey = cacheKeys.productById(id);
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const product = await Product.findById(id)
          .populate('category', 'name slug')
          .lean();
        
        return product;
      },
      CACHE_TTL.PRODUCT_DETAIL
    );
  }

  /**
   * Get category by slug with caching
   */
  async getCategoryBySlug(slug) {
    const cacheKey = cacheKeys.category(slug);
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return Category.findOne({ slug, isActive: true }).lean();
      },
      CACHE_TTL.CATEGORIES
    );
  }

  /**
   * Get all categories with caching
   */
  async getAllCategories() {
    const cacheKey = cacheKeys.categories();
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const categories = await Category.find({ isActive: true })
          .sort({ displayOrder: 1, name: 1 })
          .lean();
        
        return { categories };
      },
      CACHE_TTL.CATEGORIES
    );
  }

  /**
   * Update product stock (optimized for concurrent updates)
   */
  async updateStock(productId, quantityOptionId, quantityDelta) {
    const result = await Product.findOneAndUpdate(
      {
        _id: productId,
        'quantityOptions._id': quantityOptionId,
        // Ensure we don't go negative
        ...(quantityDelta < 0 && {
          'quantityOptions.stock': { $gte: Math.abs(quantityDelta) },
        }),
      },
      {
        $inc: {
          'quantityOptions.$.stock': quantityDelta,
          totalStock: quantityDelta,
        },
      },
      { new: true }
    );

    if (result) {
      // Update isOutOfStock flag
      const totalStock = result.quantityOptions.reduce((sum, opt) => sum + opt.stock, 0);
      if (totalStock === 0 && !result.isOutOfStock) {
        await Product.updateOne({ _id: productId }, { isOutOfStock: true });
      } else if (totalStock > 0 && result.isOutOfStock) {
        await Product.updateOne({ _id: productId }, { isOutOfStock: false });
      }

      // Invalidate cache
      this.invalidateProductCache(productId);
    }

    return result;
  }

  /**
   * Bulk update stock for multiple products (used in order creation)
   */
  async bulkUpdateStock(stockUpdates) {
    const bulkOps = stockUpdates.map(({ productId, quantityOptionId, quantity }) => ({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(productId),
          'quantityOptions._id': new mongoose.Types.ObjectId(quantityOptionId),
          'quantityOptions.stock': { $gte: quantity },
        },
        update: {
          $inc: {
            'quantityOptions.$.stock': -quantity,
            totalStock: -quantity,
            totalSales: quantity,
          },
        },
      },
    }));

    const result = await Product.bulkWrite(bulkOps, { ordered: false });
    
    // Invalidate all product caches
    stockUpdates.forEach(({ productId }) => this.invalidateProductCache(productId));
    
    return result;
  }

  /**
   * Invalidate product-related caches
   */
  async invalidateProductCache(productId = null) {
    const tasks = [];
    if (productId) {
      tasks.push(cacheService.deletePattern(new RegExp(`product.*${productId}`)));
    }
    tasks.push(cacheService.deletePattern(/^products:/));
    tasks.push(cacheService.delete(cacheKeys.featuredProducts()));
    await Promise.all(tasks);
  }

  /**
   * Invalidate category cache
   */
  async invalidateCategoryCache() {
    await cacheService.deletePattern(/^categor/);
  }
}

// Export singleton instance
module.exports = new ProductService();
