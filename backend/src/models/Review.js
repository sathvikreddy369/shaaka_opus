const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  orderItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  isApproved: {
    type: Boolean,
    default: true, // Auto-approve by default, admin can remove abusive ones
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: true,
  },
  // Admin moderation
  removedByAdmin: {
    type: Boolean,
    default: false,
  },
  removalReason: String,
  removedAt: Date,
  removedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ user: 1, product: 1 });
reviewSchema.index({ order: 1, orderItemId: 1 });
reviewSchema.index({ rating: 1 });

// Compound unique index to prevent duplicate reviews
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Post-save hook to update product rating
reviewSchema.post('save', async function() {
  const Product = mongoose.model('Product');
  await Product.updateRating(this.product);
});

// Post-remove hook to update product rating
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const Product = mongoose.model('Product');
    await Product.updateRating(doc.product);
  }
});

// Static method to check if user can review
reviewSchema.statics.canUserReview = async function(userId, productId, orderId, orderItemId) {
  const Order = mongoose.model('Order');
  
  // Check if order exists and is delivered
  const order = await Order.findOne({
    _id: orderId,
    user: userId,
    status: 'DELIVERED',
    'items._id': orderItemId,
  });
  
  if (!order) {
    return { canReview: false, reason: 'Order not found or not delivered' };
  }
  
  // Check if the order item matches the product
  const orderItem = order.items.id(orderItemId);
  if (!orderItem || orderItem.product.toString() !== productId.toString()) {
    return { canReview: false, reason: 'Product not found in this order' };
  }
  
  // Check if already reviewed
  if (orderItem.isReviewed) {
    return { canReview: false, reason: 'Already reviewed this product for this order' };
  }
  
  return { canReview: true, order, orderItem };
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
