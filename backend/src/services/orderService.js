/**
 * Order Service Layer
 * Centralizes order-related business logic
 */

const mongoose = require('mongoose');
const { Order, Product, Cart, User, Vendor } = require('../models');
const { cacheService, cacheKeys } = require('./cacheService');
const productService = require('./productService');
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_WINDOW_MINUTES,
  DELIVERY,
} = require('../constants');
const { ValidationError, NotFoundError } = require('../utils/errors');

class OrderService {
  /**
   * Generate unique order number
   * Uses date-based prefix with cached daily counter
   */
  async generateOrderNumber() {
    const date = new Date();
    const prefix = 'SH';
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const cacheKey = cacheKeys.orderCount(dateStr);

    // Get today's count from cache or calculate
    let count = await cacheService.get(cacheKey);
    
    if (count === null) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      count = await Order.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });
    }

    count++;
    await cacheService.set(cacheKey, count, 86400); // Cache for 24 hours

    const sequence = String(count).padStart(4, '0');
    return `${prefix}${dateStr}${sequence}`;
  }

  /**
   * Validate cart and prepare order items
   * Returns validated items with stock checks
   */
  async validateCartForOrder(userId) {
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart || cart.items.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    const { validatedItems, invalidItems } = await cart.validateAndGetPrices();
    
    if (invalidItems.length > 0) {
      throw new ValidationError('Some items in your cart are no longer available', {
        invalidItems: invalidItems.map(item => ({
          name: item.productName,
          reason: item.reason,
        })),
      });
    }

    // Double-check stock availability with locking
    for (const item of validatedItems) {
      const product = await Product.findById(item.product._id);
      const option = product?.quantityOptions.id(item.quantityOption._id);
      
      if (!option || option.stock < item.quantity) {
        throw new ValidationError(
          `${item.product.name} (${item.quantityOption.quantity}) is out of stock or has insufficient quantity`
        );
      }
    }

    return { cart, validatedItems };
  }

  /**
   * Calculate order totals
   */
  calculateTotals(items, discount = 0) {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryCharge = subtotal >= DELIVERY.FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY.DELIVERY_CHARGE;
    const total = Math.max(0, subtotal - discount + deliveryCharge);

    return {
      subtotal,
      deliveryCharge,
      discount,
      total,
    };
  }

  /**
   * Reserve stock for order items
   * Uses bulk operation for efficiency
   */
  async reserveStock(items) {
    const stockUpdates = items.map(item => ({
      productId: item.product._id || item.product,
      quantityOptionId: item.quantityOption._id || item.quantityOptionId,
      quantity: item.quantity,
    }));

    const result = await productService.bulkUpdateStock(stockUpdates);
    
    // Check if all updates succeeded
    if (result.modifiedCount !== items.length) {
      throw new ValidationError('Some items are no longer available in the requested quantity');
    }

    return result;
  }

  /**
   * Release reserved stock (on order cancellation)
   */
  async releaseStock(order) {
    if (!order.stockReserved) return;

    const bulkOps = order.items.map(item => ({
      updateOne: {
        filter: {
          _id: item.product,
          'quantityOptions._id': item.quantityOptionId,
        },
        update: {
          $inc: {
            'quantityOptions.$.stock': item.quantity,
            totalStock: item.quantity,
            totalSales: -item.quantity,
          },
        },
      },
    }));

    await Product.bulkWrite(bulkOps, { ordered: false });
    
    // Update order
    order.stockReserved = false;
    await order.save();

    // Invalidate product caches
    await Promise.all(
      order.items.map(item => productService.invalidateProductCache(item.product.toString()))
    );
  }

  /**
   * Validate status transition
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Update order status with validation
   */
  async updateStatus(orderId, newStatus, updatedBy, note = null) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new NotFoundError('Order');
    }

    if (!this.isValidStatusTransition(order.status, newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${order.status} to ${newStatus}`
      );
    }

    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      updatedBy,
      note,
    });

    // Handle specific status changes
    if (newStatus === ORDER_STATUS.CANCELLED) {
      order.cancelledAt = new Date();
      await this.releaseStock(order);
    }

    if (newStatus === ORDER_STATUS.REFUNDED) {
      order.refundedAt = new Date();
    }

    if (newStatus === ORDER_STATUS.DELIVERED && order.paymentMethod === PAYMENT_METHOD.COD) {
      order.paymentStatus = PAYMENT_STATUS.PAID;
    }

    await order.save();
    return order;
  }

  /**
   * Get orders with efficient pagination
   */
  async getOrders(filters = {}, options = {}) {
    const {
      userId,
      vendorId,
      status,
      paymentStatus,
      hasVendorProducts,
      startDate,
      endDate,
    } = filters;

    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      populate = true,
    } = options;

    const query = {};

    if (userId) query.user = userId;
    if (vendorId) query.vendors = vendorId;
    if (status) query.status = Array.isArray(status) ? { $in: status } : status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (hasVendorProducts !== undefined) query.hasVendorProducts = hasVendorProducts;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    let queryBuilder = Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (populate) {
      queryBuilder = queryBuilder
        .populate('user', 'name phone email')
        .populate('items.product', 'name slug images')
        .populate('vendors', 'businessName');
    }

    const [orders, total] = await Promise.all([
      queryBuilder.lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get order statistics for dashboard
   */
  async getOrderStats(filters = {}) {
    const { vendorId, startDate, endDate } = filters;
    
    const matchStage = {};
    if (vendorId) matchStage.vendors = new mongoose.Types.ObjectId(vendorId);
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.PAID] }, '$total', 0],
            },
          },
          pendingOrders: {
            $sum: {
              $cond: [{ $in: ['$status', [ORDER_STATUS.PLACED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED]] }, 1, 0],
            },
          },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', ORDER_STATUS.CANCELLED] }, 1, 0],
            },
          },
          averageOrderValue: { $avg: '$total' },
        },
      },
    ]);

    return stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      averageOrderValue: 0,
    };
  }

  /**
   * Check if payment window is still valid
   */
  isPaymentWindowValid(order) {
    if (!order.paymentExpiresAt) return true;
    return new Date() < order.paymentExpiresAt;
  }

  /**
   * Get payment window expiry time
   */
  getPaymentExpiryTime() {
    return new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000);
  }
}

// Export singleton instance
module.exports = new OrderService();
