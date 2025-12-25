const { Review, Order, Product, AuditLog } = require('../models');
const { asyncHandler, sendResponse, getPaginationData } = require('../utils/helpers');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errors');

/**
 * @desc    Get product reviews
 * @route   GET /api/products/:productId/reviews
 * @access  Public
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const filter = {
    product: productId,
    isApproved: true,
    removedByAdmin: false,
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    Review.countDocuments(filter),
  ]);

  // Get rating distribution
  const ratingStats = await Review.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  const ratingDistribution = {};
  for (let i = 5; i >= 1; i--) {
    const stat = ratingStats.find(s => s._id === i);
    ratingDistribution[i] = stat ? stat.count : 0;
  }

  sendResponse(res, 200, {
    data: {
      reviews,
      ratingDistribution,
      pagination: getPaginationData(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Create review
 * @route   POST /api/products/:productId/reviews
 * @access  Private
 */
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { orderId, orderItemId, rating, title, comment } = req.body;

  // Check if user can review
  const { canReview, reason, order, orderItem } = await Review.canUserReview(
    req.userId,
    productId,
    orderId,
    orderItemId
  );

  if (!canReview) {
    throw new ValidationError(reason);
  }

  // Create review
  const review = await Review.create({
    user: req.userId,
    product: productId,
    order: orderId,
    orderItemId,
    rating,
    title,
    comment,
    isVerifiedPurchase: true,
  });

  // Mark order item as reviewed
  orderItem.isReviewed = true;
  await order.save();

  // Update product rating
  await Product.updateRating(productId);

  await review.populate('user', 'name');

  sendResponse(res, 201, {
    data: { review },
  }, 'Review submitted');
});

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:reviewId
 * @access  Private
 */
const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { rating, title, comment } = req.body;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Review');
  }

  if (review.user.toString() !== req.userId.toString()) {
    throw new AuthorizationError('You can only update your own reviews');
  }

  if (rating) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;

  await review.save();

  // Update product rating
  await Product.updateRating(review.product);

  await review.populate('user', 'name');

  sendResponse(res, 200, {
    data: { review },
  }, 'Review updated');
});

/**
 * @desc    Delete own review
 * @route   DELETE /api/reviews/:reviewId
 * @access  Private
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Review');
  }

  if (review.user.toString() !== req.userId.toString()) {
    throw new AuthorizationError('You can only delete your own reviews');
  }

  const productId = review.product;

  // Mark order item as not reviewed
  const order = await Order.findById(review.order);
  if (order) {
    const orderItem = order.items.id(review.orderItemId);
    if (orderItem) {
      orderItem.isReviewed = false;
      await order.save();
    }
  }

  await Review.findByIdAndDelete(reviewId);

  // Update product rating
  await Product.updateRating(productId);

  sendResponse(res, 200, {}, 'Review deleted');
});

/**
 * @desc    Get user's reviews
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const filter = { user: req.userId };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('product', 'name slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Review.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: {
      reviews,
      pagination: getPaginationData(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Get pending reviews (products user can review)
 * @route   GET /api/reviews/pending
 * @access  Private
 */
const getPendingReviews = asyncHandler(async (req, res) => {
  // Get delivered orders with unreviewed items
  const orders = await Order.find({
    user: req.userId,
    status: 'DELIVERED',
    'items.isReviewed': false,
  }).sort({ createdAt: -1 });

  const pendingReviews = [];

  for (const order of orders) {
    for (const item of order.items) {
      if (!item.isReviewed) {
        pendingReviews.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderItemId: item._id,
          product: {
            _id: item.product,
            name: item.productSnapshot.name,
            slug: item.productSnapshot.slug,
            image: item.productSnapshot.image,
          },
          quantityOption: item.quantityOptionSnapshot.quantity,
          orderedAt: order.createdAt,
        });
      }
    }
  }

  sendResponse(res, 200, {
    data: { pendingReviews },
  });
});

// Admin controllers

/**
 * @desc    Get all reviews (admin)
 * @route   GET /api/admin/reviews
 * @access  Admin
 */
const getAdminReviews = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    product,
    rating,
    isApproved,
    removedByAdmin,
    sort = '-createdAt',
  } = req.query;

  const filter = {};

  if (product) filter.product = product;
  if (rating) filter.rating = parseInt(rating);
  if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
  if (removedByAdmin !== undefined) filter.removedByAdmin = removedByAdmin === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name phone')
      .populate('product', 'name slug')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    Review.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: {
      reviews,
      pagination: getPaginationData(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Remove review (admin)
 * @route   DELETE /api/admin/reviews/:reviewId
 * @access  Admin
 */
const adminRemoveReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { reason } = req.body;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Review');
  }

  review.removedByAdmin = true;
  review.removalReason = reason;
  review.removedAt = new Date();
  review.removedBy = req.userId;
  review.isApproved = false;

  await review.save();

  // Update product rating
  await Product.updateRating(review.product);

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'REVIEW_REMOVE',
    entityType: 'Review',
    entityId: review._id,
    entityName: `Review by ${review.user}`,
    newValue: { reason },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, {}, 'Review removed');
});

/**
 * @desc    Restore review (admin)
 * @route   PUT /api/admin/reviews/:reviewId/restore
 * @access  Admin
 */
const adminRestoreReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Review');
  }

  review.removedByAdmin = false;
  review.removalReason = undefined;
  review.removedAt = undefined;
  review.removedBy = undefined;
  review.isApproved = true;

  await review.save();

  // Update product rating
  await Product.updateRating(review.product);

  sendResponse(res, 200, {
    data: { review },
  }, 'Review restored');
});

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  getPendingReviews,
  getAdminReviews,
  adminRemoveReview,
  adminRestoreReview,
};
