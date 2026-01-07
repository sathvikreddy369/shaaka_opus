/**
 * Notification Service
 * Centralized service for managing all notifications (FCM + in-app)
 */

const { Notification, FCMToken, User, Vendor, NOTIFICATION_TYPES, TARGET_ROLES, ROLES } = require('../models');
const { getMessaging, isFirebaseEnabled } = require('../config/firebase');
const { cacheService, cacheKeys } = require('./cacheService');

class NotificationService {
  constructor() {
    this.messaging = null;
    this.isEnabled = false;
  }

  /**
   * Initialize the notification service
   */
  initialize() {
    this.messaging = getMessaging();
    this.isEnabled = isFirebaseEnabled();
    console.log(`[NotificationService] Initialized. FCM enabled: ${this.isEnabled}`);
  }

  /**
   * Send notification to a single user
   */
  async sendToUser(userId, notification, options = {}) {
    const { saveToDB = true, sendPush = true, targetRole = TARGET_ROLES.USER } = options;
    
    try {
      let dbNotification = null;
      
      // Save to database
      if (saveToDB) {
        dbNotification = await Notification.createNotification({
          user: userId,
          targetRole,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          relatedEntity: notification.relatedEntity,
          actionUrl: notification.actionUrl,
          data: notification.data || {},
        });
        
        // Invalidate unread count cache
        await this.invalidateUnreadCountCache(userId, targetRole);
      }
      
      // Send FCM push notification
      if (sendPush && this.isEnabled) {
        await this.sendFCMToUser(userId, notification);
      }
      
      return dbNotification;
    } catch (error) {
      console.error('[NotificationService] Error sending to user:', error);
      throw error;
    }
  }

  /**
   * Send notification to a vendor
   */
  async sendToVendor(vendorId, notification, options = {}) {
    const { saveToDB = true, sendPush = true } = options;
    
    try {
      // Get vendor to find linked user
      const vendor = await Vendor.findById(vendorId).populate('user');
      if (!vendor || !vendor.user) {
        console.warn(`[NotificationService] Vendor not found or no user linked: ${vendorId}`);
        return null;
      }
      
      let dbNotification = null;
      
      // Save to database
      if (saveToDB) {
        dbNotification = await Notification.createNotification({
          user: vendor.user._id,
          vendor: vendorId,
          targetRole: TARGET_ROLES.VENDOR,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          relatedEntity: notification.relatedEntity,
          actionUrl: notification.actionUrl,
          data: notification.data || {},
        });
        
        // Invalidate unread count cache
        await this.invalidateUnreadCountCache(vendor.user._id, TARGET_ROLES.VENDOR);
      }
      
      // Send FCM push notification
      if (sendPush && this.isEnabled) {
        await this.sendFCMToUser(vendor.user._id, notification);
      }
      
      return dbNotification;
    } catch (error) {
      console.error('[NotificationService] Error sending to vendor:', error);
      throw error;
    }
  }

  /**
   * Send notification to all admins
   */
  async sendToAdmins(notification, options = {}) {
    const { saveToDB = true, sendPush = true } = options;
    
    try {
      // Get all admin users
      const admins = await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id');
      
      if (admins.length === 0) {
        console.warn('[NotificationService] No active admins found');
        return [];
      }
      
      const notifications = [];
      
      for (const admin of admins) {
        const dbNotification = await this.sendToUser(admin._id, notification, {
          saveToDB,
          sendPush,
          targetRole: TARGET_ROLES.ADMIN,
        });
        if (dbNotification) {
          notifications.push(dbNotification);
        }
      }
      
      return notifications;
    } catch (error) {
      console.error('[NotificationService] Error sending to admins:', error);
      throw error;
    }
  }

  /**
   * Send notification to all staff members
   */
  async sendToStaff(notification, options = {}) {
    const { saveToDB = true, sendPush = true } = options;
    
    try {
      // Get all staff users
      const staffMembers = await User.find({ role: ROLES.STAFF, isActive: true }).select('_id');
      
      if (staffMembers.length === 0) {
        return [];
      }
      
      const notifications = [];
      
      for (const staff of staffMembers) {
        const dbNotification = await this.sendToUser(staff._id, notification, {
          saveToDB,
          sendPush,
          targetRole: TARGET_ROLES.STAFF,
        });
        if (dbNotification) {
          notifications.push(dbNotification);
        }
      }
      
      return notifications;
    } catch (error) {
      console.error('[NotificationService] Error sending to staff:', error);
      throw error;
    }
  }

  /**
   * Send FCM notification to a user's devices
   */
  async sendFCMToUser(userId, notification) {
    if (!this.isEnabled) {
      return { success: false, reason: 'FCM not enabled' };
    }
    
    try {
      // Get user's active FCM tokens
      const tokens = await FCMToken.getActiveTokens(userId);
      
      if (tokens.length === 0) {
        return { success: false, reason: 'No active tokens' };
      }
      
      const tokenStrings = tokens.map(t => t.token);
      
      // Build FCM message
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: notification.type || 'GENERAL',
          actionUrl: notification.actionUrl || '',
          ...this.serializeData(notification.data || {}),
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#4CAF50',
            clickAction: 'OPEN_ACTIVITY',
            channelId: this.getChannelId(notification.type),
          },
          priority: 'high',
        },
        webpush: {
          notification: {
            icon: '/images/logo.jpeg',
            badge: '/images/badge.png',
            requireInteraction: this.isHighPriority(notification.type),
          },
          fcmOptions: {
            link: notification.actionUrl || '/',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
              'content-available': 1,
            },
          },
        },
      };
      
      // Send to all tokens
      const response = await this.messaging.sendEachForMulticast({
        ...message,
        tokens: tokenStrings,
      });
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        await this.handleFailedTokens(tokens, response.responses);
      }
      
      // Update last used for successful tokens
      for (let i = 0; i < response.responses.length; i++) {
        if (response.responses[i].success) {
          await FCMToken.updateLastUsed(tokenStrings[i]);
        }
      }
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('[NotificationService] FCM send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle failed FCM tokens
   */
  async handleFailedTokens(tokens, responses) {
    for (let i = 0; i < responses.length; i++) {
      if (!responses[i].success) {
        const error = responses[i].error;
        const errorCode = error?.code;
        
        // Mark token as invalid for specific error codes
        if ([
          'messaging/invalid-registration-token',
          'messaging/registration-token-not-registered',
          'messaging/invalid-argument',
        ].includes(errorCode)) {
          await FCMToken.markTokenInvalid(tokens[i].token, errorCode);
        }
      }
    }
  }

  /**
   * Get Android notification channel ID based on type
   */
  getChannelId(type) {
    if (type?.startsWith('ORDER_')) return 'orders';
    if (type?.startsWith('VENDOR_')) return 'vendor';
    if (type?.startsWith('ADMIN_')) return 'admin';
    if (type?.startsWith('STAFF_')) return 'staff';
    return 'general';
  }

  /**
   * Check if notification is high priority
   */
  isHighPriority(type) {
    const highPriorityTypes = [
      NOTIFICATION_TYPES.ORDER_PLACED,
      NOTIFICATION_TYPES.VENDOR_NEW_ORDER,
      NOTIFICATION_TYPES.VENDOR_APPROVED,
      NOTIFICATION_TYPES.VENDOR_REJECTED,
      NOTIFICATION_TYPES.ADMIN_NEW_VENDOR,
    ];
    return highPriorityTypes.includes(type);
  }

  /**
   * Serialize data object for FCM (all values must be strings)
   */
  serializeData(data) {
    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        serialized[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
    return serialized;
  }

  /**
   * Invalidate unread count cache
   */
  async invalidateUnreadCountCache(userId, role) {
    const cacheKey = `notifications:unread:${role}:${userId}`;
    await cacheService.delete(cacheKey);
  }

  /**
   * Get unread count with caching
   */
  async getUnreadCount(userId, role) {
    const cacheKey = `notifications:unread:${role}:${userId}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    let count;
    if (role === TARGET_ROLES.VENDOR) {
      // For vendors, get vendor ID first
      const user = await User.findById(userId);
      if (user?.vendorProfile) {
        count = await Notification.getUnreadCount(user.vendorProfile, role);
      } else {
        count = 0;
      }
    } else {
      count = await Notification.getUnreadCount(userId, role);
    }
    
    await cacheService.set(cacheKey, count, 60); // Cache for 1 minute
    return count;
  }

  // ==========================================
  // ORDER NOTIFICATION HELPERS
  // ==========================================

  /**
   * Send order placed notification to user
   */
  async notifyOrderPlaced(order, user) {
    return this.sendToUser(user._id, {
      title: 'Order Placed Successfully! 🎉',
      body: `Your order #${order.orderNumber} worth ₹${order.total} has been placed.`,
      type: NOTIFICATION_TYPES.ORDER_PLACED,
      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
        orderNumber: order.orderNumber,
      },
      actionUrl: `/orders/${order._id}`,
      data: { orderId: order._id.toString(), orderNumber: order.orderNumber },
    });
  }

  /**
   * Send order confirmed notification
   */
  async notifyOrderConfirmed(order, user) {
    return this.sendToUser(user._id, {
      title: 'Order Confirmed! ✅',
      body: `Your order #${order.orderNumber} has been confirmed and is being prepared.`,
      type: NOTIFICATION_TYPES.ORDER_CONFIRMED,
      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
        orderNumber: order.orderNumber,
      },
      actionUrl: `/orders/${order._id}`,
    });
  }

  /**
   * Send order packed notification
   */
  async notifyOrderPacked(order, user) {
    return this.sendToUser(user._id, {
      title: 'Order Packed! 📦',
      body: `Your order #${order.orderNumber} has been packed and is ready for dispatch.`,
      type: NOTIFICATION_TYPES.ORDER_PACKED,
      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
        orderNumber: order.orderNumber,
      },
      actionUrl: `/orders/${order._id}`,
    });
  }

  /**
   * Send order out for delivery notification
   */
  async notifyOrderHandedToAgent(order, user) {
    return this.sendToUser(user._id, {
      title: 'Out for Delivery! 🚚',
      body: `Your order #${order.orderNumber} is out for delivery. Get ready to receive it!`,
      type: NOTIFICATION_TYPES.ORDER_HANDED_TO_AGENT,
      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
        orderNumber: order.orderNumber,
      },
      actionUrl: `/orders/${order._id}`,
    });
  }

  /**
   * Send order delivered notification
   */
  async notifyOrderDelivered(order, user) {
    return this.sendToUser(user._id, {
      title: 'Order Delivered! 🎊',
      body: `Your order #${order.orderNumber} has been delivered. Enjoy your products!`,
      type: NOTIFICATION_TYPES.ORDER_DELIVERED,
      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
        orderNumber: order.orderNumber,
      },
      actionUrl: `/orders/${order._id}`,
    });
  }

  /**
   * Send order cancelled notification
   */
  async notifyOrderCancelled(order, user, reason = '') {
    return this.sendToUser(user._id, {
      title: 'Order Cancelled',
      body: `Your order #${order.orderNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      type: NOTIFICATION_TYPES.ORDER_CANCELLED,
      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
        orderNumber: order.orderNumber,
      },
      actionUrl: `/orders/${order._id}`,
    });
  }

  /**
   * Send order refunded notification
   */
  async notifyOrderRefunded(order, user, amount) {
    return this.sendToUser(user._id, {
      title: 'Refund Processed! 💰',
      body: `₹${amount} has been refunded for order #${order.orderNumber}. It will reflect in 5-7 business days.`,
      type: NOTIFICATION_TYPES.ORDER_REFUNDED,
      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
        orderNumber: order.orderNumber,
      },
      actionUrl: `/orders/${order._id}`,
    });
  }

  // ==========================================
  // VENDOR NOTIFICATION HELPERS
  // ==========================================

  /**
   * Notify vendor of new order
   */
  async notifyVendorNewOrder(vendorId, order, itemCount) {
    return this.sendToVendor(vendorId, {
      title: 'New Order Received! 🔔',
      body: `You have a new order #${order.orderNumber} with ${itemCount} item(s). Please confirm.`,
      type: NOTIFICATION_TYPES.VENDOR_NEW_ORDER,
      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
        orderNumber: order.orderNumber,
      },
      actionUrl: `/vendor/orders/${order._id}`,
      data: { orderId: order._id.toString(), itemCount },
    });
  }

  /**
   * Notify vendor of approval
   */
  async notifyVendorApproved(vendorId, businessName) {
    return this.sendToVendor(vendorId, {
      title: 'Congratulations! You\'re Approved! 🎉',
      body: `${businessName} has been approved. You can now start adding products and accepting orders.`,
      type: NOTIFICATION_TYPES.VENDOR_APPROVED,
      relatedEntity: {
        entityType: 'Vendor',
        entityId: vendorId,
        vendorName: businessName,
      },
      actionUrl: '/vendor',
    });
  }

  /**
   * Notify vendor of rejection
   */
  async notifyVendorRejected(vendorId, businessName, reason) {
    return this.sendToVendor(vendorId, {
      title: 'Application Update',
      body: `Your vendor application for ${businessName} could not be approved.${reason ? ` Reason: ${reason}` : ''}`,
      type: NOTIFICATION_TYPES.VENDOR_REJECTED,
      relatedEntity: {
        entityType: 'Vendor',
        entityId: vendorId,
        vendorName: businessName,
      },
      actionUrl: '/vendor',
    });
  }

  /**
   * Notify vendor of suspension
   */
  async notifyVendorSuspended(vendorId, businessName, reason) {
    return this.sendToVendor(vendorId, {
      title: 'Account Suspended',
      body: `${businessName} has been suspended.${reason ? ` Reason: ${reason}` : ''} Please contact support.`,
      type: NOTIFICATION_TYPES.VENDOR_SUSPENDED,
      relatedEntity: {
        entityType: 'Vendor',
        entityId: vendorId,
        vendorName: businessName,
      },
      actionUrl: '/vendor',
    });
  }

  // ==========================================
  // ADMIN NOTIFICATION HELPERS
  // ==========================================

  /**
   * Notify admins of new vendor registration
   */
  async notifyAdminsNewVendor(vendor) {
    return this.sendToAdmins({
      title: 'New Vendor Registration 📋',
      body: `${vendor.businessName} has registered as a vendor. Review and approve.`,
      type: NOTIFICATION_TYPES.ADMIN_NEW_VENDOR,
      relatedEntity: {
        entityType: 'Vendor',
        entityId: vendor._id,
        vendorName: vendor.businessName,
      },
      actionUrl: `/admin/vendors/${vendor._id}`,
    });
  }

  /**
   * Notify admins of low stock
   */
  async notifyAdminsLowStock(product, stock) {
    return this.sendToAdmins({
      title: 'Low Stock Alert ⚠️',
      body: `${product.name} is running low on stock (${stock} remaining).`,
      type: NOTIFICATION_TYPES.ADMIN_LOW_STOCK,
      relatedEntity: {
        entityType: 'Product',
        entityId: product._id,
        productName: product.name,
      },
      actionUrl: `/admin/products/${product._id}`,
    });
  }

  // ==========================================
  // STAFF NOTIFICATION HELPERS
  // ==========================================

  /**
   * Notify staff of pending orders
   */
  async notifyStaffPendingOrders(count) {
    return this.sendToStaff({
      title: 'Orders Pending 📦',
      body: `${count} order(s) are awaiting processing.`,
      type: NOTIFICATION_TYPES.STAFF_ORDER_PENDING,
      actionUrl: '/staff/orders',
      data: { pendingCount: count },
    });
  }
}

// Export singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
module.exports.NotificationService = NotificationService;
