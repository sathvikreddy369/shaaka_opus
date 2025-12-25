const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { otpLimiter, authLimiter } = require('../middleware/rateLimiter');
const {
  validate,
  phoneValidation,
  otpValidation,
  nameValidation,
  emailValidation,
  addressValidation,
  mongoIdValidation,
} = require('../middleware/validators');
const { body } = require('express-validator');

// Public routes
router.post(
  '/request-otp',
  otpLimiter,
  phoneValidation,
  validate,
  authController.requestOTP
);

router.post(
  '/verify-otp',
  authLimiter,
  phoneValidation,
  otpValidation,
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  validate,
  authController.verifyOTPAndLogin
);

router.post(
  '/refresh-token',
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  validate,
  authController.refreshToken
);

// Protected routes
router.use(authenticate);

router.get('/me', authController.getMe);

router.put(
  '/profile',
  nameValidation.optional(),
  emailValidation,
  validate,
  authController.updateProfile
);

router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);

// Address routes
router.get('/addresses', authController.getAddresses);

router.post(
  '/addresses',
  addressValidation,
  validate,
  authController.addAddress
);

router.put(
  '/addresses/:addressId',
  mongoIdValidation('addressId'),
  validate,
  authController.updateAddress
);

router.delete(
  '/addresses/:addressId',
  mongoIdValidation('addressId'),
  validate,
  authController.deleteAddress
);

router.put(
  '/addresses/:addressId/default',
  mongoIdValidation('addressId'),
  validate,
  authController.setDefaultAddress
);

module.exports = router;
