const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validate, mongoIdValidation, reviewValidation, paginationValidation } = require('../middleware/validators');
const { body } = require('express-validator');

router.use(authenticate);

// User routes
router.get('/my-reviews', paginationValidation, validate, reviewController.getMyReviews);

router.get('/pending', reviewController.getPendingReviews);

router.put(
  '/:reviewId',
  mongoIdValidation('reviewId'),
  reviewValidation,
  validate,
  reviewController.updateReview
);

router.delete(
  '/:reviewId',
  mongoIdValidation('reviewId'),
  validate,
  reviewController.deleteReview
);

module.exports = router;

// Export admin routes
module.exports.adminRoutes = express.Router();

module.exports.adminRoutes.get(
  '/',
  authenticate,
  adminOnly,
  paginationValidation,
  validate,
  reviewController.getAdminReviews
);

module.exports.adminRoutes.delete(
  '/:reviewId',
  authenticate,
  adminOnly,
  mongoIdValidation('reviewId'),
  body('reason').notEmpty().trim().isLength({ max: 500 }),
  validate,
  reviewController.adminRemoveReview
);

module.exports.adminRoutes.put(
  '/:reviewId/restore',
  authenticate,
  adminOnly,
  mongoIdValidation('reviewId'),
  validate,
  reviewController.adminRestoreReview
);
