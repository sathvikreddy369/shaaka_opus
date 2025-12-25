const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validation result handler middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    throw new ValidationError('Validation failed', formattedErrors);
  }
  next();
};

// Phone validation
const phoneValidation = body('phone')
  .trim()
  .matches(/^[6-9]\d{9}$/)
  .withMessage('Please enter a valid 10-digit Indian mobile number');

// OTP validation
const otpValidation = body('otp')
  .trim()
  .isLength({ min: 6, max: 6 })
  .isNumeric()
  .withMessage('Please enter a valid 6-digit OTP');

// Name validation
const nameValidation = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2 and 50 characters');

// Email validation
const emailValidation = body('email')
  .optional({ checkFalsy: true })
  .trim()
  .isEmail()
  .normalizeEmail()
  .withMessage('Please enter a valid email address');

// Address validations
const addressValidation = [
  body('label')
    .trim()
    .isIn(['Home', 'Office', 'Other'])
    .withMessage('Label must be Home, Office, or Other'),
  body('houseNumber')
    .trim()
    .notEmpty()
    .withMessage('House/Apartment number is required')
    .isLength({ max: 50 }),
  body('street')
    .trim()
    .notEmpty()
    .withMessage('Street is required')
    .isLength({ max: 100 }),
  body('colony')
    .trim()
    .notEmpty()
    .withMessage('Colony is required')
    .isLength({ max: 100 }),
  body('landmark')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Please provide a valid latitude'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Please provide a valid longitude'),
];

// Product validations
const productValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 200 }),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 }),
  body('constituents')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('quantityOptions')
    .isArray({ min: 1 })
    .withMessage('At least one quantity option is required'),
  body('quantityOptions.*.quantity')
    .trim()
    .notEmpty()
    .withMessage('Quantity label is required'),
  body('quantityOptions.*.price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('quantityOptions.*.stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('quantityOptions.*.discountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percent must be between 0 and 100'),
  body('quantityOptions.*.discountFlat')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Flat discount must be a positive number'),
];

// Category validation
const categoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 50 }),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),
];

// Cart item validation
const cartItemValidation = [
  body('productId')
    .notEmpty()
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('quantityOptionId')
    .notEmpty()
    .isMongoId()
    .withMessage('Invalid quantity option ID'),
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
];

// Review validation
const reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }),
  body('comment')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }),
];

// Order status validation
const orderStatusValidation = body('status')
  .isIn(['CONFIRMED', 'PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT', 'DELIVERED', 'CANCELLED'])
  .withMessage('Invalid order status');

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// MongoDB ID validation
const mongoIdValidation = (paramName = 'id') =>
  param(paramName).isMongoId().withMessage('Invalid ID');

module.exports = {
  validate,
  phoneValidation,
  otpValidation,
  nameValidation,
  emailValidation,
  addressValidation,
  productValidation,
  categoryValidation,
  cartItemValidation,
  reviewValidation,
  orderStatusValidation,
  paginationValidation,
  mongoIdValidation,
};
