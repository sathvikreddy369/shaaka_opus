const mongoose = require('mongoose');
const { Order, Cart, Product, User, AuditLog } = require('../models');
const { 
  createOrder, 
  verifyPaymentSignature, 
  verifyWebhookSignature, 
  initiateRefund,
  fetchPayment,
  fetchOrder,
  fetchOrderPayments,
  extractPaymentDetails 
} = require('../config/razorpay');
const { asyncHandler, sendResponse, getPaginationData } = require('../utils/helpers');
const { NotFoundError, ValidationError, AppError } = require('../utils/errors');
const { isWithinDeliveryRadius, calculateDeliveryCharge, meetsMinimumOrderValue } = require('../utils/location');
const { sendOrderConfirmationSMS, sendOrderStatusSMS } = require('../utils/msg91');
const config = require('../config');

// Payment window validity in minutes
const PAYMENT_WINDOW_MINUTES = 30;

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

  try {
    // Generate order number
    const orderNumber = await Order.generateOrderNumber();

    // Create order items with snapshots
    const orderItems = [];
    for (const item of validatedItems) {
      const product = await Product.findById(item.product._id);
      const quantityOption = product.quantityOptions.id(item.quantityOption._id);

      // Double-check stock
      if (quantityOption.stock < item.quantity) {
        throw new ValidationError(
          `${product.name} (${quantityOption.quantity}) is out of stock`
        );
      }

      // Reserve stock (reduce it)
      quantityOption.stock -= item.quantity;
      await product.save();

      // Update product sales count
      product.totalSales += item.quantity;
      await product.save();

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
      orderData.paymentDetails = {
        razorpayOrderId: razorpayOrder.id,
        amount: total,
        currency: 'INR',
      };
      orderData.paymentStatus = 'PENDING';
      orderData.status = 'PAYMENT_PENDING';
      orderData.statusHistory = [
        { status: 'PLACED', timestamp: new Date() },
        { status: 'PAYMENT_PENDING', timestamp: new Date() },
      ];
      // Set payment window expiry (30 minutes)
      orderData.paymentExpiresAt = new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000);
    } else if (paymentMethod === 'COD') {
      orderData.paymentStatus = 'PENDING';
      orderData.paymentDetails = {
        method: 'cod',
        amount: total,
        currency: 'INR',
      };
    }

    const order = await Order.create(orderData);

    // Clear cart
    await cart.clearCart();
    await cart.save();

    // Return response
    const response = {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        paymentMethod: order.paymentMethod,
      },
    };

    if (razorpayOrder) {
      response.razorpayOrder = {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      };
    }

    sendResponse(res, 201, {
      data: response,
    }, 'Order created');

  } catch (error) {
    throw error;
  }
});

/**
 * @desc    Verify Razorpay payment
 * @route   POST /api/orders/:orderId/verify-payment
 * @access  Private
 * 
 * NOTE: This is a secondary verification. Primary verification happens via webhooks.
 * This endpoint just updates the UI immediately after payment.
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

  // Check if payment is already processed (idempotency)
  if (order.hasSuccessfulPayment()) {
    // Already paid - return success
    return sendResponse(res, 200, {
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
      },
    }, 'Payment already verified');
  }

  // Check if payment window has expired
  if (!order.isPaymentWindowValid()) {
    throw new ValidationError('Payment window has expired. Please place a new order.');
  }

  if (order.razorpay.orderId !== razorpay_order_id) {
    throw new ValidationError('Invalid order');
  }

  // Verify signature locally first
  const isSignatureValid = verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isSignatureValid) {
    // Record failed attempt
    order.recordPaymentAttempt(razorpay_payment_id, 'failed', null, {
      code: 'SIGNATURE_MISMATCH',
      description: 'Payment signature verification failed',
    });
    await order.save();
    throw new ValidationError('Payment verification failed');
  }

  // Fetch payment details from Razorpay (server-side verification)
  let paymentDetails;
  try {
    const razorpayPayment = await fetchPayment(razorpay_payment_id);
    
    // Verify payment status from Razorpay
    if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
      order.recordPaymentAttempt(razorpay_payment_id, 'failed', razorpayPayment.method, {
        code: razorpayPayment.error_code || 'PAYMENT_NOT_CAPTURED',
        description: razorpayPayment.error_description || 'Payment not in captured/authorized state',
      });
      await order.save();
      throw new ValidationError('Payment not confirmed by Razorpay');
    }
    
    // Verify amount matches
    const expectedAmount = Math.round(order.total * 100);
    if (razorpayPayment.amount !== expectedAmount) {
      order.recordPaymentAttempt(razorpay_payment_id, 'failed', razorpayPayment.method, {
        code: 'AMOUNT_MISMATCH',
        description: `Expected ${expectedAmount}, got ${razorpayPayment.amount}`,
      });
      await order.save();
      throw new ValidationError('Payment amount mismatch');
    }
    
    // Extract detailed payment info
    paymentDetails = extractPaymentDetails(razorpayPayment);
    
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    console.error('Error fetching payment from Razorpay:', error);
    // If we can't verify with Razorpay, rely on signature (already verified above)
    // Continue but with limited details
    paymentDetails = {
      razorpayPaymentId: razorpay_payment_id,
      amount: order.total,
      currency: 'INR',
    };
  }

  // Update order with payment details
  order.paymentStatus = 'PAID';
  order.razorpay.paymentId = razorpay_payment_id;
  order.razorpay.signature = razorpay_signature;
  order.paymentDetails = {
    ...order.paymentDetails,
    ...paymentDetails,
    razorpaySignature: razorpay_signature,
    capturedAt: new Date(),
  };
  order.status = 'CONFIRMED';
  order.statusHistory.push({
    status: 'CONFIRMED',
    timestamp: new Date(),
    note: 'Payment confirmed',
  });
  
  // Record successful attempt
  order.recordPaymentAttempt(razorpay_payment_id, 'success', paymentDetails.method);
  
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
 * 
 * This is the PRIMARY source of truth for payment status.
 * The frontend verification is just for immediate UI feedback.
 */
const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  // Verify webhook signature
  const isValid = verifyWebhookSignature(req.body, signature);
  if (!isValid) {
    console.error('Invalid webhook signature');
    throw new AppError('Invalid webhook signature', 400);
  }

  const { event, payload } = req.body;
  
  console.log(`[Razorpay Webhook] Event: ${event}`);

  try {
    switch (event) {
      case 'payment.authorized':
        await handlePaymentAuthorized(payload.payment.entity);
        break;
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      case 'refund.created':
      case 'refund.processed':
        await handleRefundProcessed(payload.refund.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(payload.order.entity, payload.payment?.entity);
        break;
      default:
        console.log(`[Razorpay Webhook] Unhandled event: ${event}`);
    }
  } catch (error) {
    console.error(`[Razorpay Webhook] Error handling ${event}:`, error);
    // Still return 200 to prevent Razorpay from retrying
  }

  res.status(200).json({ status: 'ok' });
});

/**
 * Handle payment.authorized event
 * Payment authorized but not yet captured
 */
const handlePaymentAuthorized = async (payment) => {
  const order = await Order.findOne({ 'razorpay.orderId': payment.order_id });
  if (!order) {
    console.log(`[Webhook] Order not found for razorpay order: ${payment.order_id}`);
    return;
  }

  // Update payment status to authorized
  if (order.paymentStatus === 'PENDING') {
    order.paymentStatus = 'AUTHORIZED';
    order.recordPaymentAttempt(payment.id, 'initiated', payment.method);
    await order.save();
    console.log(`[Webhook] Payment authorized for order: ${order.orderNumber}`);
  }
};

/**
 * Handle payment.captured event - PRIMARY payment confirmation
 */
const handlePaymentCaptured = async (payment) => {
  const order = await Order.findOne({ 'razorpay.orderId': payment.order_id });
  if (!order) {
    console.log(`[Webhook] Order not found for razorpay order: ${payment.order_id}`);
    return;
  }

  // Idempotency check - already paid?
  if (order.paymentStatus === 'PAID') {
    console.log(`[Webhook] Order ${order.orderNumber} already paid, skipping`);
    return;
  }

  // Duplicate payment check - if there's already a successful payment
  if (order.razorpay.paymentId && order.razorpay.paymentId !== payment.id) {
    console.log(`[Webhook] Duplicate payment attempt for order ${order.orderNumber}. Original: ${order.razorpay.paymentId}, New: ${payment.id}`);
    // This is a duplicate payment - should be refunded
    // TODO: Auto-refund duplicate payments
    return;
  }

  // Extract detailed payment info
  const paymentDetails = extractPaymentDetails(payment);

  // Update order
  order.paymentStatus = 'PAID';
  order.razorpay.paymentId = payment.id;
  order.paymentDetails = {
    ...order.paymentDetails,
    ...paymentDetails,
    capturedAt: new Date(),
  };
  
  // Only update status if still pending
  if (['PLACED', 'PAYMENT_PENDING'].includes(order.status)) {
    order.status = 'CONFIRMED';
    order.statusHistory.push({
      status: 'CONFIRMED',
      timestamp: new Date(),
      note: 'Payment captured via webhook',
    });
  }
  
  order.recordPaymentAttempt(payment.id, 'success', payment.method);
  await order.save();

  console.log(`[Webhook] Payment captured for order: ${order.orderNumber}, Method: ${payment.method}`);

  // Send confirmation SMS
  try {
    const user = await User.findById(order.user);
    if (user) {
      await sendOrderConfirmationSMS(user.phone, order.orderNumber, order.total);
    }
  } catch (error) {
    console.error(`[Webhook] Failed to send SMS for order ${order.orderNumber}:`, error);
  }
};

/**
 * Handle payment.failed event
 */
const handlePaymentFailed = async (payment) => {
  const order = await Order.findOne({ 'razorpay.orderId': payment.order_id });
  if (!order) {
    console.log(`[Webhook] Order not found for razorpay order: ${payment.order_id}`);
    return;
  }

  // Don't update if already paid (edge case with webhook ordering)
  if (order.paymentStatus === 'PAID') {
    console.log(`[Webhook] Order ${order.orderNumber} already paid, ignoring failure`);
    return;
  }

  // Record failed attempt
  order.recordPaymentAttempt(payment.id, 'failed', payment.method, {
    code: payment.error_code,
    description: payment.error_description,
  });

  // Update payment details with error info
  if (!order.paymentDetails) {
    order.paymentDetails = {};
  }
  order.paymentDetails.errorCode = payment.error_code;
  order.paymentDetails.errorDescription = payment.error_description;
  order.paymentDetails.errorSource = payment.error_source;
  order.paymentDetails.errorStep = payment.error_step;
  order.paymentDetails.errorReason = payment.error_reason;
  order.paymentDetails.failedAt = new Date();

  // Check if payment window expired
  const paymentExpired = order.paymentExpiresAt && new Date() > order.paymentExpiresAt;
  
  // Check number of failed attempts
  const failedAttempts = order.paymentAttempts.filter(a => a.status === 'failed').length;
  
  // Only mark as failed/cancelled if:
  // 1. Payment window expired, OR
  // 2. More than 3 failed attempts
  if (paymentExpired || failedAttempts >= 3) {
    order.paymentStatus = 'FAILED';
    order.status = 'PAYMENT_FAILED';
    order.statusHistory.push({
      status: 'PAYMENT_FAILED',
      timestamp: new Date(),
      note: paymentExpired ? 'Payment window expired' : `Payment failed after ${failedAttempts} attempts`,
    });

    // Restore stock
    if (order.stockReserved) {
      await restoreOrderStock(order);
      order.stockReserved = false;
    }
  }

  await order.save();
  console.log(`[Webhook] Payment failed for order: ${order.orderNumber}, Error: ${payment.error_code}`);
};

/**
 * Handle order.paid event (backup confirmation)
 */
const handleOrderPaid = async (razorpayOrder, payment) => {
  const order = await Order.findOne({ 'razorpay.orderId': razorpayOrder.id });
  if (!order) return;

  // If already paid, skip
  if (order.paymentStatus === 'PAID') return;

  // Get payments for this order if not provided
  if (!payment) {
    try {
      const payments = await fetchOrderPayments(razorpayOrder.id);
      payment = payments.items?.find(p => p.status === 'captured');
    } catch (error) {
      console.error(`[Webhook] Error fetching payments for order ${razorpayOrder.id}:`, error);
    }
  }

  if (payment) {
    await handlePaymentCaptured(payment);
  }
};

/**
 * Handle refund events
 */
const handleRefundProcessed = async (refund) => {
  const order = await Order.findOne({ 'razorpay.paymentId': refund.payment_id });
  if (!order) {
    console.log(`[Webhook] Order not found for payment: ${refund.payment_id}`);
    return;
  }

  const refundAmount = refund.amount / 100;
  const isFullRefund = refundAmount >= order.total;

  order.razorpay.refundId = refund.id;
  order.paymentDetails = order.paymentDetails || {};
  order.paymentDetails.razorpayRefundId = refund.id;
  order.paymentDetails.refundedAt = new Date();
  order.refundAmount = (order.refundAmount || 0) + refundAmount;
  order.refundedAt = new Date();
  
  if (isFullRefund) {
    order.paymentStatus = 'REFUNDED';
    order.status = 'REFUNDED';
  } else {
    order.paymentStatus = 'PARTIALLY_REFUNDED';
  }
  
  order.statusHistory.push({
    status: order.status,
    timestamp: new Date(),
    note: `Refund of ₹${refundAmount} processed`,
  });
  
  await order.save();
  console.log(`[Webhook] Refund processed for order: ${order.orderNumber}, Amount: ₹${refundAmount}`);

  // Send SMS
  try {
    const user = await User.findById(order.user);
    if (user) {
      await sendOrderStatusSMS(user.phone, order.orderNumber, 'REFUNDED');
    }
  } catch (error) {
    console.error(`[Webhook] Failed to send refund SMS for order ${order.orderNumber}:`, error);
  }
};

/**
 * Helper function to restore stock
 */
const restoreOrderStock = async (order) => {
  for (const item of order.items) {
    try {
      const product = await Product.findById(item.product);
      if (product) {
        const quantityOption = product.quantityOptions.id(item.quantityOptionId);
        if (quantityOption) {
          quantityOption.stock += item.quantity;
          // Also revert sales count
          product.totalSales = Math.max(0, product.totalSales - item.quantity);
          await product.save();
        }
      }
    } catch (error) {
      console.error(`Error restoring stock for product ${item.product}:`, error);
    }
  }
};

/**
 * @desc    Check payment status (for polling when page was closed)
 * @route   GET /api/orders/:orderId/payment-status
 * @access  Private
 */
const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    _id: orderId,
    user: req.userId,
  });

  if (!order) {
    throw new NotFoundError('Order');
  }

  // If payment is pending and we have a Razorpay order, check with Razorpay
  if (order.paymentStatus === 'PENDING' && order.razorpay.orderId) {
    try {
      const razorpayOrder = await fetchOrder(order.razorpay.orderId);
      
      if (razorpayOrder.status === 'paid') {
        // Order is paid on Razorpay side but not updated here
        // Fetch the payment details
        const payments = await fetchOrderPayments(order.razorpay.orderId);
        const capturedPayment = payments.items?.find(p => p.status === 'captured');
        
        if (capturedPayment) {
          await handlePaymentCaptured(capturedPayment);
          // Refresh order data
          await order.reload();
        }
      }
    } catch (error) {
      console.error('Error checking payment status with Razorpay:', error);
    }
  }

  sendResponse(res, 200, {
    data: {
      paymentStatus: order.paymentStatus,
      status: order.status,
      canRetry: order.paymentStatus === 'PENDING' && order.isPaymentWindowValid(),
    },
  });
});

/**
 * @desc    Retry payment (get new Razorpay order for existing order)
 * @route   POST /api/orders/:orderId/retry-payment
 * @access  Private
 */
const retryPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({
    _id: orderId,
    user: req.userId,
  });

  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.paymentMethod !== 'RAZORPAY') {
    throw new ValidationError('Only online payment orders can be retried');
  }

  if (order.paymentStatus === 'PAID') {
    throw new ValidationError('Order is already paid');
  }

  if (order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED') {
    throw new ValidationError('Order has been cancelled or expired');
  }

  // Check if still within payment window (or extend it)
  const now = new Date();
  if (order.paymentExpiresAt && now > order.paymentExpiresAt) {
    // Extend payment window by 15 more minutes for retry
    order.paymentExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  }

  // Create a new Razorpay order
  const razorpayOrder = await createOrder(order.total, 'INR', order.orderNumber, {
    orderId: order.orderNumber,
    userId: order.user.toString(),
    retry: true,
  });

  // Update order with new Razorpay order
  order.razorpay.orderId = razorpayOrder.id;
  order.paymentDetails = order.paymentDetails || {};
  order.paymentDetails.razorpayOrderId = razorpayOrder.id;
  order.status = 'PAYMENT_PENDING';
  
  await order.save();

  sendResponse(res, 200, {
    data: {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
      },
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    },
  }, 'Payment retry initiated');
});

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
 * @desc    Cancel order (user - very restricted)
 * @route   POST /api/orders/:orderId/cancel
 * @access  Private
 * 
 * NOTE: Users can only cancel COD orders that are still in PLACED status.
 * For online payment orders, users must contact support.
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

  if (!order.canBeCancelledByUser()) {
    if (order.paymentMethod === 'RAZORPAY') {
      throw new ValidationError(
        'Online payment orders cannot be cancelled. Please contact support for assistance.'
      );
    }
    throw new ValidationError(
      'Order cannot be cancelled at this stage. Please contact support.'
    );
  }

  await order.updateStatus('CANCELLED', req.userId, reason);
  order.cancellationReason = reason || 'Cancelled by customer';
  order.cancelledBy = 'USER';
  await order.save();

  // Restore stock
  if (order.stockReserved) {
    await restoreOrderStock(order);
    order.stockReserved = false;
    await order.save();
  }

  // Send SMS
  try {
    const user = await User.findById(order.user);
    if (user) {
      await sendOrderStatusSMS(user.phone, order.orderNumber, 'CANCELLED');
    }
  } catch (error) {
    console.error('Failed to send cancellation SMS:', error);
  }

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
 * @desc    Get single order (admin) - with full payment details
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

  // Prepare payment info for admin view
  const paymentInfo = {
    method: order.paymentMethod,
    status: order.paymentStatus,
    amount: order.total,
  };

  if (order.paymentMethod === 'RAZORPAY' && order.paymentDetails) {
    const pd = order.paymentDetails;
    paymentInfo.razorpayOrderId = pd.razorpayOrderId || order.razorpay.orderId;
    paymentInfo.razorpayPaymentId = pd.razorpayPaymentId || order.razorpay.paymentId;
    paymentInfo.transactionId = pd.acquirerData?.rrn || pd.acquirerData?.upiTransactionId;
    paymentInfo.paymentMethod = pd.method;
    paymentInfo.fee = pd.fee ? (pd.fee / 100) : null; // Convert from paise
    paymentInfo.tax = pd.tax ? (pd.tax / 100) : null;
    
    // Payment method specific details
    if (pd.method === 'upi') {
      paymentInfo.upiVpa = pd.upiVpa;
    } else if (pd.method === 'card') {
      paymentInfo.cardDetails = {
        last4: pd.cardLast4,
        network: pd.cardNetwork,
        type: pd.cardType,
        issuer: pd.cardIssuer,
      };
    } else if (pd.method === 'netbanking') {
      paymentInfo.bankName = pd.bankName;
    } else if (pd.method === 'wallet') {
      paymentInfo.walletName = pd.walletName;
    }
    
    paymentInfo.contact = pd.contact;
    paymentInfo.email = pd.email;
    paymentInfo.capturedAt = pd.capturedAt;
    
    // Error details if failed
    if (pd.errorCode) {
      paymentInfo.error = {
        code: pd.errorCode,
        description: pd.errorDescription,
        source: pd.errorSource,
        step: pd.errorStep,
        reason: pd.errorReason,
      };
      paymentInfo.failedAt = pd.failedAt;
    }
    
    // Refund info
    if (order.refundAmount) {
      paymentInfo.refund = {
        refundId: pd.razorpayRefundId || order.razorpay.refundId,
        amount: order.refundAmount,
        refundedAt: pd.refundedAt || order.refundedAt,
      };
    }
  }

  // Include payment attempts for troubleshooting
  const paymentAttempts = order.paymentAttempts?.map(attempt => ({
    attemptedAt: attempt.attemptedAt,
    paymentId: attempt.razorpayPaymentId,
    status: attempt.status,
    method: attempt.method,
    error: attempt.errorCode ? {
      code: attempt.errorCode,
      description: attempt.errorDescription,
    } : null,
  })) || [];

  sendResponse(res, 200, {
    data: { 
      order,
      paymentInfo,
      paymentAttempts,
    },
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

  if (!order.canBeCancelledByAdmin()) {
    throw new ValidationError('Cannot cancel this order');
  }

  await order.updateStatus('CANCELLED', req.userId, reason);
  order.cancellationReason = reason || 'Cancelled by admin';
  order.cancelledBy = 'ADMIN';
  await order.save();

  // Restore stock
  if (order.stockReserved) {
    await restoreOrderStock(order);
    order.stockReserved = false;
    await order.save();
  }

  // Initiate refund if requested and paid
  if (shouldRefund && order.paymentStatus === 'PAID' && order.razorpay.paymentId) {
    try {
      const refund = await initiateRefund(order.razorpay.paymentId, order.total, {
        orderId: order.orderNumber,
        reason: reason || 'Order cancelled by admin',
      });
      order.paymentStatus = 'REFUND_INITIATED';
      order.status = 'REFUND_INITIATED';
      order.razorpay.refundId = refund.id;
      order.paymentDetails = order.paymentDetails || {};
      order.paymentDetails.razorpayRefundId = refund.id;
      order.statusHistory.push({
        status: 'REFUND_INITIATED',
        timestamp: new Date(),
        updatedBy: req.userId,
        note: 'Refund initiated by admin',
      });
      await order.save();
    } catch (error) {
      console.error('Refund initiation failed:', error);
      // Don't throw - order is already cancelled
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
    newValue: { status: 'CANCELLED', refundInitiated: shouldRefund },
    description: reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send SMS
  try {
    const user = await User.findById(order.user);
    if (user) {
      await sendOrderStatusSMS(user.phone, order.orderNumber, 'CANCELLED');
    }
  } catch (error) {
    console.error('Failed to send cancellation SMS:', error);
  }

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
  checkPaymentStatus,
  retryPayment,
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
