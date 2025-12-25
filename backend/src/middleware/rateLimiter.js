const rateLimit = require('express-rate-limit');
const config = require('../config');
const { RateLimitError } = require('../utils/errors');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OTP request rate limiter
 */
const otpLimiter = rateLimit({
  windowMs: config.rateLimit.otpWindowMs,
  max: config.rateLimit.otpMax,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
    code: 'OTP_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use phone number as key for OTP rate limiting
    return req.body.phone || req.ip;
  },
});

/**
 * Auth routes rate limiter
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create account rate limiter
 */
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 accounts per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again later',
    code: 'ACCOUNT_CREATION_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Order creation rate limiter
 */
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 orders per hour
  message: {
    success: false,
    message: 'Too many orders placed, please try again later',
    code: 'ORDER_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin rate limiter (more lenient)
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  otpLimiter,
  authLimiter,
  createAccountLimiter,
  orderLimiter,
  adminLimiter,
};
