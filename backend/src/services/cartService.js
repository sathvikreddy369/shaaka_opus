/**
 * Cart Service - Centralized cart business logic with optimizations
 */

const mongoose = require('mongoose');
const { Cart, Product } = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { CART_LIMITS } = require('../constants');
const { cacheService } = require('./cacheService');

// Cache keys
const CACHE_KEYS = {
  userCart: (userId) => `cart:user:${userId}`,
  cartSummary: (userId) => `cart:summary:${userId}`,
};

class CartService {
  /**
   * Get or create cart for user
   * @param {string} userId - User ID
   * @param {boolean} createIfNotExists - Create cart if not found
   * @returns {Promise<Object>} Cart document
   */
  async getOrCreateCart(userId, createIfNotExists = true) {
    let cart = await Cart.findOne({ user: userId });
    
    if (!cart && createIfNotExists) {
      cart = await Cart.create({ user: userId, items: [] });
    }
    
    return cart;
  }

  /**
   * Get validated cart with current prices
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Validated cart data
   */
  async getValidatedCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    
    if (!cart || cart.items.length === 0) {
      return {
        _id: cart?._id,
        items: [],
        invalidItems: [],
        itemCount: 0,
        subtotal: 0,
      };
    }
    
    const { validatedItems, invalidItems } = await cart.validateAndGetPrices();
    const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    return {
      _id: cart._id,
      items: validatedItems,
      invalidItems,
      itemCount: validatedItems.length,
      subtotal,
    };
  }

  /**
   * Add item to cart with validation
   * @param {string} userId - User ID
   * @param {Object} itemData - Item data (productId, quantityOptionId, quantity)
   * @returns {Promise<Object>} Updated cart
   */
  async addItem(userId, { productId, quantityOptionId, quantity = 1 }) {
    // Validate product and quantity option
    const product = await Product.findOne({ _id: productId, isActive: true })
      .select('name quantityOptions')
      .lean();
    
    if (!product) {
      throw new NotFoundError('Product');
    }

    const quantityOption = product.quantityOptions.find(
      opt => opt._id.toString() === quantityOptionId
    );
    
    if (!quantityOption) {
      throw new NotFoundError('Quantity option');
    }

    // Check stock
    if (quantityOption.stock < quantity) {
      throw new ValidationError(`Only ${quantityOption.stock} items available in stock`);
    }

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Check existing quantity in cart
    const existingItem = cart.items.find(
      item => item.product.toString() === productId &&
              item.quantityOptionId.toString() === quantityOptionId
    );

    const totalQty = (existingItem?.quantity || 0) + quantity;
    
    if (totalQty > CART_LIMITS.MAX_QUANTITY_PER_ITEM) {
      throw new ValidationError(`Maximum ${CART_LIMITS.MAX_QUANTITY_PER_ITEM} items per product allowed`);
    }
    
    if (totalQty > quantityOption.stock) {
      throw new ValidationError(`Only ${quantityOption.stock} items available in stock`);
    }

    // Create price snapshot
    const priceSnapshot = {
      quantity: quantityOption.quantity,
      price: quantityOption.price,
      sellingPrice: quantityOption.sellingPrice,
    };

    await cart.addItem(productId, quantityOptionId, quantity, priceSnapshot);
    
    // Invalidate cache
    this.invalidateCartCache(userId);
    
    return this.getValidatedCart(userId);
  }

  /**
   * Update cart item quantity
   * @param {string} userId - User ID
   * @param {string} itemId - Cart item ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart
   */
  async updateItemQuantity(userId, itemId, quantity) {
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      throw new NotFoundError('Cart');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      throw new NotFoundError('Cart item');
    }

    // Validate stock for new quantity
    const product = await Product.findOne({ _id: item.product, isActive: true })
      .select('quantityOptions')
      .lean();
    
    if (!product) {
      throw new NotFoundError('Product');
    }

    const quantityOption = product.quantityOptions.find(
      opt => opt._id.toString() === item.quantityOptionId.toString()
    );
    
    if (!quantityOption) {
      throw new NotFoundError('Quantity option');
    }

    if (quantity > quantityOption.stock) {
      throw new ValidationError(`Only ${quantityOption.stock} items available in stock`);
    }

    if (quantity > CART_LIMITS.MAX_QUANTITY_PER_ITEM) {
      throw new ValidationError(`Maximum ${CART_LIMITS.MAX_QUANTITY_PER_ITEM} items per product allowed`);
    }

    // Update quantity
    await cart.updateItemQuantity(itemId, quantity);
    
    // Invalidate cache
    this.invalidateCartCache(userId);
    
    return this.getValidatedCart(userId);
  }

  /**
   * Remove item from cart
   * @param {string} userId - User ID
   * @param {string} itemId - Cart item ID
   * @returns {Promise<Object>} Updated cart
   */
  async removeItem(userId, itemId) {
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      throw new NotFoundError('Cart');
    }

    await cart.removeItem(itemId);
    
    // Invalidate cache
    this.invalidateCartCache(userId);
    
    return this.getValidatedCart(userId);
  }

  /**
   * Clear entire cart
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Empty cart
   */
  async clearCart(userId) {
    const cart = await Cart.findOne({ user: userId });
    
    if (cart) {
      await cart.clearCart();
      this.invalidateCartCache(userId);
    }
    
    return {
      items: [],
      invalidItems: [],
      itemCount: 0,
      subtotal: 0,
    };
  }

  /**
   * Remove invalid/unavailable items from cart
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Cleaned cart
   */
  async removeInvalidItems(userId) {
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart || cart.items.length === 0) {
      return this.getValidatedCart(userId);
    }

    const { invalidItems } = await cart.validateAndGetPrices();
    
    // Remove invalid items
    for (const invalid of invalidItems) {
      const itemIndex = cart.items.findIndex(
        item => item._id.toString() === invalid.itemId.toString()
      );
      if (itemIndex !== -1) {
        cart.items.splice(itemIndex, 1);
      }
    }
    
    if (invalidItems.length > 0) {
      cart.lastModified = new Date();
      await cart.save();
      this.invalidateCartCache(userId);
    }
    
    return this.getValidatedCart(userId);
  }

  /**
   * Get cart item count for header badge
   * @param {string} userId - User ID
   * @returns {Promise<number>} Item count
   */
  async getItemCount(userId) {
    const cacheKey = `cart:count:${userId}`;
    
    return cacheService.getOrSet(cacheKey, async () => {
      const result = await Cart.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        { $project: { itemCount: { $size: '$items' } } }
      ]);
      
      return result[0]?.itemCount || 0;
    }, 60); // 1 minute cache for count
  }

  /**
   * Bulk validate carts for checkout readiness (admin use)
   * @param {string[]} userIds - Array of user IDs
   * @returns {Promise<Object[]>} Cart validation results
   */
  async bulkValidateCarts(userIds) {
    const carts = await Cart.find({ 
      user: { $in: userIds },
      'items.0': { $exists: true } // Only non-empty carts
    });
    
    const results = await Promise.all(
      carts.map(async (cart) => {
        const { validatedItems, invalidItems } = await cart.validateAndGetPrices();
        return {
          userId: cart.user,
          isValid: invalidItems.length === 0,
          itemCount: validatedItems.length,
          invalidCount: invalidItems.length,
          subtotal: validatedItems.reduce((sum, item) => sum + item.subtotal, 0),
        };
      })
    );
    
    return results;
  }

  /**
   * Merge guest cart with user cart after login
   * @param {string} userId - User ID
   * @param {Object[]} guestItems - Guest cart items
   * @returns {Promise<Object>} Merged cart
   */
  async mergeGuestCart(userId, guestItems) {
    if (!guestItems || guestItems.length === 0) {
      return this.getValidatedCart(userId);
    }

    const cart = await this.getOrCreateCart(userId);
    
    // Process each guest item
    for (const guestItem of guestItems) {
      try {
        // Check if product/option already in cart
        const existingItem = cart.items.find(
          item => item.product.toString() === guestItem.productId &&
                  item.quantityOptionId.toString() === guestItem.quantityOptionId
        );
        
        if (existingItem) {
          // Update quantity (won't exceed max due to validation in updateItemQuantity)
          const newQuantity = Math.min(
            existingItem.quantity + guestItem.quantity,
            CART_LIMITS.MAX_QUANTITY_PER_ITEM
          );
          await cart.updateItemQuantity(existingItem._id, newQuantity);
        } else {
          // Add new item
          await this.addItem(userId, guestItem);
        }
      } catch (error) {
        // Skip invalid items during merge
        console.warn(`Failed to merge cart item: ${error.message}`);
      }
    }
    
    this.invalidateCartCache(userId);
    return this.getValidatedCart(userId);
  }

  /**
   * Invalidate all cart-related caches for user
   * @param {string} userId - User ID
   */
  async invalidateCartCache(userId) {
    await Promise.all([
      cacheService.delete(CACHE_KEYS.userCart(userId)),
      cacheService.delete(CACHE_KEYS.cartSummary(userId)),
      cacheService.delete(`cart:count:${userId}`),
    ]);
  }
}

module.exports = new CartService();
