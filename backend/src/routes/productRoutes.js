const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { authenticate, adminOnly, optionalAuth } = require('../middleware/auth');
const { uploadProductImages } = require('../config/cloudinary');
const {
  validate,
  productValidation,
  paginationValidation,
  mongoIdValidation,
  reviewValidation,
} = require('../middleware/validators');
const { body, query } = require('express-validator');

// Public routes
router.get(
  '/',
  paginationValidation,
  query('category').optional().trim(),
  query('search').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('inStock').optional().isBoolean(),
  query('featured').optional().isBoolean(),
  query('sort').optional().isIn(['price-asc', 'price-desc', 'rating', 'newest', 'popular']),
  validate,
  productController.getProducts
);

router.get('/featured', productController.getFeaturedProducts);

router.get(
  '/id/:id',
  mongoIdValidation(),
  validate,
  productController.getProductById
);

router.get('/:slug', productController.getProduct);

router.get('/:slug/related', productController.getRelatedProducts);

// Product reviews
router.get(
  '/:productId/reviews',
  mongoIdValidation('productId'),
  paginationValidation,
  validate,
  reviewController.getProductReviews
);

router.post(
  '/:productId/reviews',
  authenticate,
  mongoIdValidation('productId'),
  body('orderId').isMongoId().withMessage('Invalid order ID'),
  body('orderItemId').isMongoId().withMessage('Invalid order item ID'),
  reviewValidation,
  validate,
  reviewController.createReview
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
  productController.getAdminProducts
);

module.exports.adminRoutes.get(
  '/low-stock',
  authenticate,
  adminOnly,
  productController.getLowStockProducts
);

module.exports.adminRoutes.post(
  '/',
  authenticate,
  adminOnly,
  uploadProductImages.array('images', 5),
  productController.createProduct
);

module.exports.adminRoutes.put(
  '/:id',
  authenticate,
  adminOnly,
  uploadProductImages.array('images', 5),
  mongoIdValidation(),
  validate,
  productController.updateProduct
);

module.exports.adminRoutes.delete(
  '/:id',
  authenticate,
  adminOnly,
  mongoIdValidation(),
  validate,
  productController.deleteProduct
);

module.exports.adminRoutes.put(
  '/:id/stock',
  authenticate,
  adminOnly,
  mongoIdValidation(),
  body('quantityOptionId').isMongoId(),
  body('stock').isInt({ min: 0 }),
  validate,
  productController.updateStock
);

module.exports.adminRoutes.put(
  '/:id/toggle-active',
  authenticate,
  adminOnly,
  mongoIdValidation(),
  validate,
  productController.toggleActive
);
