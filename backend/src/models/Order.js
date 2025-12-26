const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  // Price snapshot at time of order (immutable)
  productSnapshot: {
    name: String,
    slug: String,
    image: String,
    category: String,
  },
  quantityOptionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  quantityOptionSnapshot: {
    quantity: String,
    price: Number,
    sellingPrice: Number,
    discountPercent: Number,
    discountFlat: Number,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  isReviewed: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['PLACED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'CONFIRMED', 'PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT', 'DELIVERED', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  note: String,
}, { _id: false });

// Payment attempt tracking schema
const paymentAttemptSchema = new mongoose.Schema({
  attemptedAt: { type: Date, default: Date.now },
  razorpayPaymentId: String,
  status: { type: String, enum: ['initiated', 'success', 'failed'] },
  errorCode: String,
  errorDescription: String,
  method: String,
}, { _id: false });

// Payment details schema for storing complete transaction info
const paymentDetailsSchema = new mongoose.Schema({
  // Razorpay specific
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  razorpayRefundId: String,
  
  // Payment method details (fetched from Razorpay)
  method: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi', 'emi', 'cod', 'unknown'],
  },
  
  // UPI specific
  upiVpa: String, // user@upi
  
  // Card specific
  cardLast4: String,
  cardNetwork: String, // Visa, Mastercard, etc.
  cardType: String, // credit, debit
  cardIssuer: String,
  
  // Netbanking specific
  bankName: String,
  
  // Wallet specific
  walletName: String,
  
  // General payment info
  amount: Number, // in rupees
  currency: { type: String, default: 'INR' },
  fee: Number, // Razorpay fee in paise
  tax: Number, // Tax on fee in paise
  
  // Contact info used during payment
  email: String,
  contact: String, // Phone number
  
  // Transaction identifiers
  acquirerData: {
    rrn: String, // Bank reference number
    authCode: String,
    upiTransactionId: String,
  },
  
  // Payment timestamps
  capturedAt: Date,
  failedAt: Date,
  refundedAt: Date,
  
  // Error info (for failed payments)
  errorCode: String,
  errorDescription: String,
  errorSource: String,
  errorStep: String,
  errorReason: String,
  
  // International payment
  international: { type: Boolean, default: false },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Order must have at least one item',
    },
  },
  // Delivery address (snapshot)
  deliveryAddress: {
    label: String,
    houseNumber: String,
    street: String,
    colony: String,
    landmark: String,
    latitude: Number,
    longitude: Number,
  },
  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  // Payment
  paymentMethod: {
    type: String,
    required: true,
    enum: ['RAZORPAY', 'COD'],
  },
  paymentStatus: {
    type: String,
    default: 'PENDING',
    enum: ['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUND_INITIATED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  },
  // Legacy razorpay field for backward compatibility
  razorpay: {
    orderId: String,
    paymentId: String,
    signature: String,
    refundId: String,
  },
  // New detailed payment info
  paymentDetails: paymentDetailsSchema,
  
  // Payment attempts tracking (for retry and analytics)
  paymentAttempts: [paymentAttemptSchema],
  
  // Payment window expiry (for online payments)
  paymentExpiresAt: Date,
  
  // Stock reserved flag
  stockReserved: { type: Boolean, default: true },
  
  // Order Status
  status: {
    type: String,
    default: 'PLACED',
    enum: ['PLACED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'CONFIRMED', 'PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT', 'DELIVERED', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'],
  },
  statusHistory: [statusHistorySchema],
  // Cancellation
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['USER', 'ADMIN', 'SYSTEM'],
  },
  cancelledAt: Date,
  // Refund
  refundAmount: {
    type: Number,
    min: 0,
  },
  refundedAt: Date,
  // Notes
  orderNotes: String,
  adminNotes: String,
  // Flags
  isCODVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes (orderNumber already indexed via unique: true in schema)
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'razorpay.orderId': 1 });
orderSchema.index({ 'razorpay.paymentId': 1 });
orderSchema.index({ 'paymentDetails.razorpayOrderId': 1 });
orderSchema.index({ 'paymentDetails.razorpayPaymentId': 1 });
// TTL index for payment pending orders (auto-expire after 30 minutes)
orderSchema.index({ paymentExpiresAt: 1 }, { 
  expireAfterSeconds: 0, 
  partialFilterExpression: { status: 'PAYMENT_PENDING', paymentStatus: 'PENDING' } 
});

// Static method to generate order number
orderSchema.statics.generateOrderNumber = async function() {
  const date = new Date();
  const prefix = 'SH';
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get the count of orders today
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  const count = await this.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}${dateStr}${sequence}`;
};

// Method to check if order can be cancelled (by user - very restrictive)
orderSchema.methods.canBeCancelledByUser = function() {
  // Users can only cancel COD orders that are still in PLACED status
  // Online payment orders cannot be cancelled by user
  if (this.paymentMethod === 'RAZORPAY') {
    return false; // Users cannot cancel online payment orders
  }
  return this.status === 'PLACED' && this.paymentStatus !== 'PAID';
};

// Method to check if order can be cancelled (by admin)
orderSchema.methods.canBeCancelledByAdmin = function() {
  const nonCancellableStatuses = ['DELIVERED', 'CANCELLED', 'REFUNDED'];
  return !nonCancellableStatuses.includes(this.status);
};

// Method to update status
orderSchema.methods.updateStatus = async function(newStatus, updatedBy, note) {
  const validTransitions = {
    'PLACED': ['PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED'],
    'PAYMENT_PENDING': ['CONFIRMED', 'PAYMENT_FAILED', 'CANCELLED'],
    'PAYMENT_FAILED': ['PAYMENT_PENDING', 'CANCELLED'], // Allow retry
    'CONFIRMED': ['PACKED', 'CANCELLED'],
    'PACKED': ['READY_TO_DELIVER', 'CANCELLED'],
    'READY_TO_DELIVER': ['HANDED_TO_AGENT'],
    'HANDED_TO_AGENT': ['DELIVERED'],
    'DELIVERED': [],
    'CANCELLED': ['REFUND_INITIATED'],
    'REFUND_INITIATED': ['REFUNDED', 'PARTIALLY_REFUNDED'],
    'REFUNDED': [],
  };
  
  if (!validTransitions[this.status]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    note,
  });
  
  if (newStatus === 'CANCELLED') {
    this.cancelledAt = new Date();
  }
  
  if (newStatus === 'REFUNDED') {
    this.refundedAt = new Date();
  }
  
  // Mark COD payment as PAID when delivered
  if (newStatus === 'DELIVERED' && this.paymentMethod === 'COD') {
    this.paymentStatus = 'PAID';
  }
  
  await this.save();
  return this;
};

// Method to record payment attempt
orderSchema.methods.recordPaymentAttempt = function(paymentId, status, method = null, error = null) {
  this.paymentAttempts.push({
    attemptedAt: new Date(),
    razorpayPaymentId: paymentId,
    status,
    method,
    errorCode: error?.code,
    errorDescription: error?.description,
  });
};

// Method to check for duplicate/already successful payment
orderSchema.methods.hasSuccessfulPayment = function() {
  return this.paymentStatus === 'PAID' || 
    this.paymentAttempts.some(attempt => attempt.status === 'success');
};

// Method to check if payment is still valid (not expired)
orderSchema.methods.isPaymentWindowValid = function() {
  if (!this.paymentExpiresAt) return true;
  return new Date() < this.paymentExpiresAt;
};

// Virtual for formatted order date
orderSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
});

// Virtual for payment method display
orderSchema.virtual('paymentMethodDisplay').get(function() {
  if (this.paymentMethod === 'COD') return 'Cash on Delivery';
  
  const details = this.paymentDetails;
  if (!details?.method) return 'Online Payment';
  
  switch (details.method) {
    case 'upi':
      return `UPI${details.upiVpa ? ` (${details.upiVpa})` : ''}`;
    case 'card':
      return `${details.cardNetwork || 'Card'} ${details.cardType || ''} ****${details.cardLast4 || ''}`.trim();
    case 'netbanking':
      return `Net Banking${details.bankName ? ` - ${details.bankName}` : ''}`;
    case 'wallet':
      return `${details.walletName || 'Wallet'}`;
    case 'emi':
      return 'EMI';
    default:
      return 'Online Payment';
  }
});

// Ensure virtuals are included in JSON
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
