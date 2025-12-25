const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rateLimiter');
const {
  validate,
  mongoIdValidation,
  paginationValidation,
  orderStatusValidation,
} = require('../middleware/validators');
const { body, query } = require('express-validator');

router.use(authenticate);

// User routes
router.get(
  '/',
  paginationValidation,
  query('status').optional().isIn([
    'PLACED', 'CONFIRMED', 'PACKED', 'READY_TO_DELIVER',
    'HANDED_TO_AGENT', 'DELIVERED', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED',
  ]),
  validate,
  orderController.getOrders
);

router.post(
  '/',
  orderLimiter,
  body('addressId').isMongoId().withMessage('Invalid address ID'),
  body('paymentMethod').isIn(['RAZORPAY', 'COD']).withMessage('Invalid payment method'),
  body('orderNotes').optional().trim().isLength({ max: 500 }),
  validate,
  orderController.createCheckoutOrder
);

router.get(
  '/:orderId',
  mongoIdValidation('orderId'),
  validate,
  orderController.getOrder
);

router.post(
  '/:orderId/verify-payment',
  mongoIdValidation('orderId'),
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
  validate,
  orderController.verifyPayment
);

router.post(
  '/:orderId/cancel',
  mongoIdValidation('orderId'),
  body('reason').optional().trim().isLength({ max: 500 }),
  validate,
  orderController.cancelOrder
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
  orderController.getAdminOrders
);

module.exports.adminRoutes.get(
  '/:orderId',
  authenticate,
  adminOnly,
  mongoIdValidation('orderId'),
  validate,
  orderController.getAdminOrder
);

module.exports.adminRoutes.put(
  '/:orderId/status',
  authenticate,
  adminOnly,
  mongoIdValidation('orderId'),
  orderStatusValidation,
  body('note').optional().trim().isLength({ max: 500 }),
  validate,
  orderController.updateOrderStatus
);

module.exports.adminRoutes.post(
  '/:orderId/cancel',
  authenticate,
  adminOnly,
  mongoIdValidation('orderId'),
  body('reason').notEmpty().trim().isLength({ max: 500 }),
  body('initiateRefund').optional().isBoolean(),
  validate,
  orderController.adminCancelOrder
);

module.exports.adminRoutes.post(
  '/:orderId/refund',
  authenticate,
  adminOnly,
  mongoIdValidation('orderId'),
  body('amount').optional().isFloat({ min: 0 }),
  body('reason').optional().trim().isLength({ max: 500 }),
  validate,
  orderController.adminInitiateRefund
);
