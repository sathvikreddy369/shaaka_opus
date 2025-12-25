const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { validate, paginationValidation, phoneValidation, mongoIdValidation } = require('../middleware/validators');
const { body, query } = require('express-validator');

// Import admin routes from other controllers
const { adminRoutes: categoryAdminRoutes } = require('./categoryRoutes');
const { adminRoutes: productAdminRoutes } = require('./productRoutes');
const { adminRoutes: orderAdminRoutes } = require('./orderRoutes');
const { adminRoutes: reviewAdminRoutes } = require('./reviewRoutes');

// Apply rate limiter and auth to all admin routes
router.use(adminLimiter);
router.use(authenticate);
router.use(adminOnly);

// Dashboard
router.get(
  '/dashboard',
  query('period').optional().isIn(['today', 'week', 'month', 'year']),
  validate,
  adminController.getDashboardStats
);

// Analytics
router.get(
  '/analytics/revenue',
  query('period').optional().isIn(['week', 'month', 'year']),
  query('groupBy').optional().isIn(['day', 'week', 'month']),
  validate,
  adminController.getRevenueAnalytics
);

router.get(
  '/analytics/orders',
  query('period').optional().isIn(['week', 'month', 'year']),
  validate,
  adminController.getOrderAnalytics
);

router.get(
  '/analytics/products',
  query('period').optional().isIn(['week', 'month', 'year']),
  validate,
  adminController.getProductAnalytics
);

// Audit logs
router.get(
  '/audit-logs',
  paginationValidation,
  validate,
  adminController.getAuditLogs
);

// Users
router.get(
  '/users',
  paginationValidation,
  validate,
  adminController.getUsers
);

router.post(
  '/users/create-admin',
  phoneValidation,
  body('name').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  validate,
  adminController.createAdmin
);

router.put(
  '/users/:userId/toggle-active',
  mongoIdValidation('userId'),
  validate,
  adminController.toggleUserActive
);

// Mount sub-routes
router.use('/categories', categoryAdminRoutes);
router.use('/products', productAdminRoutes);
router.use('/orders', orderAdminRoutes);
router.use('/reviews', reviewAdminRoutes);

module.exports = router;
