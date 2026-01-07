/**
 * Category Service - Centralized category business logic with caching
 */

const { Category, Product } = require('../models');
const { NotFoundError } = require('../utils/errors');
const { cacheService } = require('./cacheService');
const { CACHE_TTL } = require('../constants');

// Cache keys
const CACHE_KEYS = {
  allCategories: 'categories:all',
  activeCategories: 'categories:active',
  categoryBySlug: (slug) => `categories:slug:${slug}`,
  categoryTree: 'categories:tree',
  categoryProductCount: 'categories:productCount',
};

class CategoryService {
  /**
   * Get all categories with optional filtering
   * @param {Object} options - Filter options
   * @returns {Promise<Object[]>} Categories list
   */
  async getCategories({ active = undefined } = {}) {
    const cacheKey = active === undefined 
      ? CACHE_KEYS.allCategories 
      : `categories:active:${active}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      const filter = {};
      if (active !== undefined) {
        filter.isActive = active;
      }

      return Category.find(filter)
        .sort({ displayOrder: 1, name: 1 })
        .lean();
    }, CACHE_TTL.CATEGORIES);
  }

  /**
   * Get active categories only (commonly used)
   * @returns {Promise<Object[]>} Active categories
   */
  async getActiveCategories() {
    return cacheService.getOrSet(CACHE_KEYS.activeCategories, async () => {
      return Category.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();
    }, CACHE_TTL.CATEGORIES);
  }

  /**
   * Get category by slug
   * @param {string} slug - Category slug
   * @returns {Promise<Object>} Category document
   */
  async getCategoryBySlug(slug) {
    return cacheService.getOrSet(CACHE_KEYS.categoryBySlug(slug), async () => {
      const category = await Category.findOne({ slug }).lean();
      if (!category) {
        throw new NotFoundError('Category');
      }
      return category;
    }, CACHE_TTL.CATEGORIES);
  }

  /**
   * Get category by ID
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} Category document
   */
  async getCategoryById(categoryId) {
    const category = await Category.findById(categoryId).lean();
    if (!category) {
      throw new NotFoundError('Category');
    }
    return category;
  }

  /**
   * Get categories with product counts
   * @returns {Promise<Object[]>} Categories with counts
   */
  async getCategoriesWithCounts() {
    return cacheService.getOrSet(CACHE_KEYS.categoryProductCount, async () => {
      const result = await Category.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'products',
            let: { categoryId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$category', '$$categoryId'] },
                      { $eq: ['$isActive', true] },
                    ],
                  },
                },
              },
              { $count: 'count' },
            ],
            as: 'productCount',
          },
        },
        {
          $addFields: {
            productCount: {
              $ifNull: [{ $arrayElemAt: ['$productCount.count', 0] }, 0],
            },
          },
        },
        { $sort: { displayOrder: 1, name: 1 } },
      ]);

      return result;
    }, CACHE_TTL.CATEGORIES);
  }

  /**
   * Get category hierarchy (for nested categories if needed)
   * @returns {Promise<Object[]>} Category tree
   */
  async getCategoryTree() {
    return cacheService.getOrSet(CACHE_KEYS.categoryTree, async () => {
      const categories = await Category.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      // Build tree structure (if parent-child relationship exists)
      // For flat structure, just return sorted list
      return this.buildTree(categories);
    }, CACHE_TTL.CATEGORIES);
  }

  /**
   * Build category tree from flat list
   * @param {Object[]} categories - Flat category list
   * @returns {Object[]} Nested category tree
   */
  buildTree(categories) {
    const map = new Map();
    const roots = [];

    // First pass: create map
    categories.forEach((cat) => {
      map.set(cat._id.toString(), { ...cat, children: [] });
    });

    // Second pass: build tree
    categories.forEach((cat) => {
      const node = map.get(cat._id.toString());
      if (cat.parent) {
        const parent = map.get(cat.parent.toString());
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Check if category has products
   * @param {string} categoryId - Category ID
   * @returns {Promise<boolean>} Has products flag
   */
  async hasProducts(categoryId) {
    const count = await Product.countDocuments({ 
      category: categoryId, 
      isActive: true 
    });
    return count > 0;
  }

  /**
   * Get products by category with pagination
   * @param {string} categoryId - Category ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Products with pagination info
   */
  async getProductsByCategory(categoryId, { page = 1, limit = 12, sortBy = 'createdAt', sortOrder = -1 } = {}) {
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find({ category: categoryId, isActive: true })
        .select('name slug images quantityOptions averageRating totalReviews')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments({ category: categoryId, isActive: true }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Validate category exists and is active
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object>} Category if valid
   */
  async validateCategory(categoryId) {
    const category = await Category.findOne({ 
      _id: categoryId, 
      isActive: true 
    }).lean();
    
    if (!category) {
      throw new NotFoundError('Category not found or inactive');
    }
    
    return category;
  }

  /**
   * Invalidate all category caches
   */
  async invalidateCache() {
    await Promise.all([
      cacheService.delete(CACHE_KEYS.allCategories),
      cacheService.delete(CACHE_KEYS.activeCategories),
      cacheService.delete(CACHE_KEYS.categoryTree),
      cacheService.delete(CACHE_KEYS.categoryProductCount),
      cacheService.deletePattern('categories:slug:'),
      cacheService.deletePattern('categories:active:'),
    ]);
  }

  /**
   * Invalidate single category cache
   * @param {string} slug - Category slug
   */
  async invalidateCategoryCache(slug) {
    await cacheService.delete(CACHE_KEYS.categoryBySlug(slug));
    // Also invalidate list caches as counts/order may change
    await this.invalidateCache();
  }
}

module.exports = new CategoryService();
