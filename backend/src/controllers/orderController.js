const mongoose = require('mongoose');
const { Order, Cart, Product, User, AuditLog } = require('../models');
const { createOrder, verifyPaymentSignature, verifyWebhookSignature, initiateRefund } = require('../config/razorpay');
const { asyncHandler, sendResponse, getPaginationData } = require('../utils/helpers');
const { NotFoundError, ValidationError, AppError } = require('../utils/errors');
const { isWithinDeliveryRadius, calculateDeliveryCharge, meetsMinimumOrderValue } = require('../utils/location');
const { sendOrderConfirmationSMS, sendOrderStatusSMS } = require('../utils/msg91');
const config = require('../config');

/**
 * @desc    Create order (initiate checkout)
 * @route   POST /api/orders
 * @access  Private
 */
const createCheckoutOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod = 'RAZORPAY', orderNotes } = req.body;

  // Get user with addresses
  const user = await User.findById(req.userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Validate address
  const address = user.addresses.id(addressId);
  if (!address) {
    throw new NotFoundError('Address');
  }

  // Check delivery radius
  const deliveryCheck = isWithinDeliveryRadius(address.latitude, address.longitude);
  if (!deliveryCheck.isDeliverable) {
    throw new ValidationError(
      `Delivery not available to this location. We deliver within ${deliveryCheck.maxRadius}km of Hyderabad.`
    );
  }

  // Validate payment method
  if (paymentMethod === 'COD' && !config.app.codEnabled) {
    throw new ValidationError('Cash on Delivery is not available');
  }

  // Get and validate cart
  const cart = await Cart.findOne({ user: req.userId });
  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cart is empty');
  }

  const { validatedItems, invalidItems } = await cart.validateAndGetPrices();
  if (invalidItems.length > 0) {
    throw new ValidationError('Some items in your cart are no longer available');
  }

  // Calculate totals
  const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Check minimum order value
  const minOrderCheck = meetsMinimumOrderValue(subtotal);
  if (!minOrderCheck.isValid) {
    throw new ValidationError(
      `Minimum order value is ₹${minOrderCheck.minRequired}. Add ₹${minOrderCheck.difference} more.`
    );
  }

  // Calculate delivery charge
  const deliveryCharge = calculateDeliveryCharge(subtotal);
  const total = subtotal + deliveryCharge;

  // Use MongoDB transaction for atomic operations
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Generate order number
    const orderNumber = await Order.generateOrderNumber();

    // Create order items with snapshots
    const orderItems = [];
    for (const item of validatedItems) {
      const product = await Product.findById(item.product._id).session(session);
      const quantityOption = product.quantityOptions.id(item.quantityOption._id);

      // Double-check stock
      if (quantityOption.stock < item.quantity) {
        throw new ValidationError(
          `${product.name} (${quantityOption.quantity}) is out of stock`
        );
      }

      // Reserve stock (reduce it)
      quantityOption.stock -= item.quantity;
      await product.save({ session });

      // Update product sales count
      product.totalSales += item.quantity;
      await product.save({ session });

      orderItems.push({
        product: product._id,
        productSnapshot: {
          name: product.name,
          slug: product.slug,
          image: product.getPrimaryImage()?.url,
          category: product.category.toString(),
        },
        quantityOptionId: quantityOption._id,
        quantityOptionSnapshot: {
          quantity: quantityOption.quantity,
          price: quantityOption.price,
          sellingPrice: quantityOption.sellingPrice,
          discountPercent: quantityOption.discountPercent,
          discountFlat: quantityOption.discountFlat,
        },
        quantity: item.quantity,
        subtotal: item.subtotal,
      });
    }

    // Create order
    const orderData = {
      orderNumber,
      user: req.userId,
      items: orderItems,
      deliveryAddress: {
        label: address.label,
        houseNumber: address.houseNumber,
        street: address.street,
        colony: address.colony,
        landmark: address.landmark,
        latitude: address.latitude,
        longitude: address.longitude,
      },
      subtotal,
      deliveryCharge,
      total,
      paymentMethod,
      orderNotes,
      statusHistory: [{ status: 'PLACED', timestamp: new Date() }],
    };

    let razorpayOrder = null;

    if (paymentMethod === 'RAZORPAY') {
      // Create Razorpay order
      razorpayOrder = await createOrder(total, 'INR', orderNumber, {
        orderId: orderNumber,
        userId: req.userId.toString(),
      });

      orderData.razorpay = {
        orderId: razorpayOrder.id,
      };
      orderData.paymentStatus = 'PENDING';
    } else if (paymentMethod === 'COD') {
      orderData.paymentStatus = 'PENDING';
    }

    const order = await Order.create([orderData], { session });

    // Clear cart
    await cart.clearCart();
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Return response
    const response = {
      order: {
        _id: order[0]._id,
        orderNumber: order[0].orderNumber,
        total: order[0].total,
        paymentMethod: order[0].paymentMethod,
      },
    };

    if (razorpayOrder) {
      response.razorpay = {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: config.razorpay.keyId,
      };
    }

    sendResponse(res, 201, {
      data: response,
    }, 'Order created');

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/orders/:orderId/verify-payment
 * @access  Private
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.user.toString() !== req.userId.toString()) {
    throw new NotFoundError('Order');
  }

  if (order.razorpay.orderId !== razorpay_order_id) {
    throw new ValidationError('Invalid order');
  }

  // Verify signature
  const isValid = verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    // Payment failed
    order.paymentStatus = 'FAILED';
    await order.save();

    // Restore stock
    await restoreOrderStock(order);

    throw new ValidationError('Payment verification failed');
  }

  // Payment successful
  order.paymentStatus = 'PAID';
  order.razorpay.paymentId = razorpay_payment_id;
  order.razorpay.signature = razorpay_signature;
  order.status = 'CONFIRMED';
  order.statusHistory.push({
    status: 'CONFIRMED',
    timestamp: new Date(),
    note: 'Payment confirmed',
  });

  await order.save();

  // Send confirmation SMS
  const user = await User.findById(order.user);
  await sendOrderConfirmationSMS(user.phone, order.orderNumber, order.total);

  sendResponse(res, 200, {
    data: {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    },
  }, 'Payment verified successfully');
});

/**
 * @desc    Handle Razorpay webhook
 * @route   POST /api/webhooks/razorpay
 * @access  Public
 */
const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  // Verify webhook signature
  const isValid = verifyWebhookSignature(req.body, signature);
  if (!isValid) {
    throw new AppError('Invalid webhook signature', 400);
  }

  const { event, payload } = req.body;

  switch (event) {
    case 'payment.captured':
      await handlePaymentCaptured(payload.payment.entity);
      break;
    case 'payment.failed':
      await handlePaymentFailed(payload.payment.entity);
      break;
    case 'refund.processed':
      await handleRefundProcessed(payload.refund.entity);
      break;
  }

  res.status(200).json({ status: 'ok' });
});

const handlePaymentCaptured = async (payment) => {
  const order = await Order.findOne({ 'razorpay.orderId': payment.order_id });
  if (!order) return;

  if (order.paymentStatus !== 'PAID') {
    order.paymentStatus = 'PAID';
    order.razorpay.paymentId = payment.id;
    order.status = 'CONFIRMED';
    order.statusHistory.push({
      status: 'CONFIRMED',
      timestamp: new Date(),
      note: 'Payment captured via webhook',
    });
    await order.save();

    // Send confirmation SMS
    const user = await User.findById(order.user);
    await sendOrderConfirmationSMS(user.phone, order.orderNumber, order.total);
  }
};

const handlePaymentFailed = async (payment) => {
  const order = await Order.findOne({ 'razorpay.orderId': payment.order_id });
  if (!order) return;

  if (order.paymentStatus === 'PENDING') {
    order.paymentStatus = 'FAILED';
    order.status = 'CANCELLED';
    order.cancellationReason = 'Payment failed';
    order.cancelledAt = new Date();
    order.statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      note: 'Payment failed',
    });
    await order.save();

    // Restore stock
    await restoreOrderStock(order);
  }
};

const handleRefundProcessed = async (refund) => {
  const order = await Order.findOne({ 'razorpay.paymentId': refund.payment_id });
  if (!order) return;

  order.paymentStatus = 'REFUNDED';
  order.status = 'REFUNDED';
  order.razorpay.refundId = refund.id;
  order.refundAmount = refund.amount / 100;
  order.refundedAt = new Date();
  order.statusHistory.push({
    status: 'REFUNDED',
    timestamp: new Date(),
    note: `Refund of ₹${order.refundAmount} processed`,
  });
  await order.save();

  // Send SMS
  const user = await User.findById(order.user);
  await sendOrderStatusSMS(user.phone, order.orderNumber, 'REFUND_INITIATED');
};

/**
 * Helper function to restore stock
 */
const restoreOrderStock = async (order) => {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      const quantityOption = product.quantityOptions.id(item.quantityOptionId);
      if (quantityOption) {
        quantityOption.stock += item.quantity;
        await product.save();
      }
    }
  }
};

/**
 * @desc    Get user's orders
 * @route   GET /api/orders
 * @access  Private
 */
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filter = { user: req.userId };
  if (status) {
    filter.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v'),
    Order.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: {
      orders,
      pagination: getPaginationData(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Get single order
 * @route   GET /api/orders/:orderId
 * @access  Private
 */
const getOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    _id: orderId,
    user: req.userId,
  });

  if (!order) {
    throw new NotFoundError('Order');
  }

  sendResponse(res, 200, {
    data: { order },
  });
});

/**
 * @desc    Cancel order
 * @route   POST /api/orders/:orderId/cancel
 * @access  Private
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  const order = await Order.findOne({
    _id: orderId,
    user: req.userId,
  });

  if (!order) {
    throw new NotFoundError('Order');
  }

  if (!order.canBeCancelled()) {
    throw new ValidationError(
      'Order cannot be cancelled at this stage. Please contact support.'
    );
  }

  await order.updateStatus('CANCELLED', req.userId, reason);
  order.cancellationReason = reason;
  order.cancelledBy = 'USER';
  await order.save();

  // Restore stock
  await restoreOrderStock(order);

  // Initiate refund if paid
  if (order.paymentStatus === 'PAID' && order.razorpay.paymentId) {
    try {
      await initiateRefund(order.razorpay.paymentId, order.total, {
        orderId: order.orderNumber,
        reason: reason || 'Order cancelled by customer',
      });
      order.paymentStatus = 'REFUND_INITIATED';
      order.status = 'REFUND_INITIATED';
      order.statusHistory.push({
        status: 'REFUND_INITIATED',
        timestamp: new Date(),
        note: 'Refund initiated',
      });
      await order.save();
    } catch (error) {
      console.error('Refund initiation failed:', error);
    }
  }

  // Send SMS
  const user = await User.findById(order.user);
  await sendOrderStatusSMS(user.phone, order.orderNumber, 'CANCELLED');

  sendResponse(res, 200, {
    data: { order },
  }, 'Order cancelled');
});

// Admin controllers

/**
 * @desc    Get all orders (admin)
 * @route   GET /api/admin/orders
 * @access  Admin
 */
const getAdminOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    paymentMethod,
    startDate,
    endDate,
    search,
    sort = '-createdAt',
  } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (paymentMethod) filter.paymentMethod = paymentMethod;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name phone email')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: {
      orders,
      pagination: getPaginationData(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Get single order (admin)
 * @route   GET /api/admin/orders/:orderId
 * @access  Admin
 */
const getAdminOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate('user', 'name phone email');

  if (!order) {
    throw new NotFoundError('Order');
  }

  sendResponse(res, 200, {
    data: { order },
  });
});

/**
 * @desc    Update order status (admin)
 * @route   PUT /api/admin/orders/:orderId/status
 * @access  Admin
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, note } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  const previousStatus = order.status;

  await order.updateStatus(status, req.userId, note);

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'ORDER_STATUS_UPDATE',
    entityType: 'Order',
    entityId: order._id,
    entityName: order.orderNumber,
    previousValue: { status: previousStatus },
    newValue: { status },
    description: note,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send SMS
  const user = await User.findById(order.user);
  await sendOrderStatusSMS(user.phone, order.orderNumber, status);

  sendResponse(res, 200, {
    data: { order },
  }, 'Order status updated');
});

/**
 * @desc    Cancel order (admin)
 * @route   POST /api/admin/orders/:orderId/cancel
 * @access  Admin
 */
const adminCancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason, initiateRefund: shouldRefund = true } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
    throw new ValidationError('Cannot cancel this order');
  }

  await order.updateStatus('CANCELLED', req.userId, reason);
  order.cancellationReason = reason;
  order.cancelledBy = 'ADMIN';
  await order.save();

  // Restore stock
  await restoreOrderStock(order);

  // Initiate refund if requested and paid
  if (shouldRefund && order.paymentStatus === 'PAID' && order.razorpay.paymentId) {
    try {
      await initiateRefund(order.razorpay.paymentId, order.total, {
        orderId: order.orderNumber,
        reason: reason || 'Order cancelled by admin',
      });
      order.paymentStatus = 'REFUND_INITIATED';
      order.status = 'REFUND_INITIATED';
      order.statusHistory.push({
        status: 'REFUND_INITIATED',
        timestamp: new Date(),
        updatedBy: req.userId,
        note: 'Refund initiated by admin',
      });
      await order.save();
    } catch (error) {
      console.error('Refund initiation failed:', error);
    }
  }

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'ORDER_CANCEL',
    entityType: 'Order',
    entityId: order._id,
    entityName: order.orderNumber,
    previousValue: { status: order.status },
    newValue: { status: 'CANCELLED' },
    description: reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send SMS
  const user = await User.findById(order.user);
  await sendOrderStatusSMS(user.phone, order.orderNumber, 'CANCELLED');

  sendResponse(res, 200, {
    data: { order },
  }, 'Order cancelled');
});

/**
 * @desc    Initiate refund (admin)
 * @route   POST /api/admin/orders/:orderId/refund
 * @access  Admin
 */
const adminInitiateRefund = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { amount, reason } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order');
  }

  if (!order.razorpay.paymentId) {
    throw new ValidationError('No payment found for this order');
  }

  if (['REFUND_INITIATED', 'REFUNDED'].includes(order.paymentStatus)) {
    throw new ValidationError('Refund already processed');
  }

  const refundAmount = amount || order.total;

  try {
    await initiateRefund(order.razorpay.paymentId, refundAmount, {
      orderId: order.orderNumber,
      reason: reason || 'Admin initiated refund',
    });

    order.paymentStatus = 'REFUND_INITIATED';
    order.refundAmount = refundAmount;
    order.statusHistory.push({
      status: 'REFUND_INITIATED',
      timestamp: new Date(),
      updatedBy: req.userId,
      note: `Refund of ₹${refundAmount} initiated`,
    });
    await order.save();

    // Audit log
    await AuditLog.log({
      admin: req.userId,
      action: 'ORDER_REFUND_INITIATE',
      entityType: 'Order',
      entityId: order._id,
      entityName: order.orderNumber,
      newValue: { refundAmount, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Send SMS
    const user = await User.findById(order.user);
    await sendOrderStatusSMS(user.phone, order.orderNumber, 'REFUND_INITIATED');

    sendResponse(res, 200, {
      data: { order },
    }, 'Refund initiated');

  } catch (error) {
    throw new AppError('Failed to initiate refund', 500);
  }
});

module.exports = {
  createCheckoutOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getOrders,
  getOrder,
  cancelOrder,
  getAdminOrders,
  getAdminOrder,
  updateOrderStatus,
  adminCancelOrder,
  adminInitiateRefund,
};
