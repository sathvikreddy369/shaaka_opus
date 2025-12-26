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
    enum: ['PLACED', 'CONFIRMED', 'PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT', 'DELIVERED', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'],
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
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUND_INITIATED', 'REFUNDED'],
  },
  razorpay: {
    orderId: String,
    paymentId: String,
    signature: String,
    refundId: String,
  },
  // Order Status
  status: {
    type: String,
    default: 'PLACED',
    enum: ['PLACED', 'CONFIRMED', 'PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT', 'DELIVERED', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'],
  },
  statusHistory: [statusHistorySchema],
  // Cancellation
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['USER', 'ADMIN'],
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

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'razorpay.orderId': 1 });
orderSchema.index({ 'razorpay.paymentId': 1 });

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

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = ['PLACED', 'CONFIRMED'];
  return cancellableStatuses.includes(this.status);
};

// Method to update status
orderSchema.methods.updateStatus = async function(newStatus, updatedBy, note) {
  const validTransitions = {
    'PLACED': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['PACKED', 'CANCELLED'],
    'PACKED': ['READY_TO_DELIVER', 'CANCELLED'],
    'READY_TO_DELIVER': ['HANDED_TO_AGENT'],
    'HANDED_TO_AGENT': ['DELIVERED'],
    'DELIVERED': [],
    'CANCELLED': ['REFUND_INITIATED'],
    'REFUND_INITIATED': ['REFUNDED'],
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

// Virtual for formatted order date
orderSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
