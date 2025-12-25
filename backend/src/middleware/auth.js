const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { asyncHandler } = require('../utils/helpers');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from Authorization header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AuthenticationError('Access token required');
  }

  // Verify token
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Get user
  const user = await User.findById(decoded.userId).select('-refreshTokens');
  if (!user) {
    throw new AuthenticationError('User not found');
  }

  if (!user.isActive) {
    throw new AuthenticationError('Account is deactivated');
  }

  // Attach user to request
  req.user = user;
  req.userId = user._id;

  next();
});

/**
 * Optional authentication - attaches user if token is valid
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      const user = await User.findById(decoded.userId).select('-refreshTokens');
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    }
  }

  next();
});

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError('Not authorized to access this resource');
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
const adminOnly = authorize('ADMIN');

/**
 * User-only middleware (excludes admins from user routes)
 */
const userOnly = authorize('USER');

/**
 * Profile completion check middleware
 */
const requireCompleteProfile = (req, res, next) => {
  if (!req.user.isProfileComplete && !req.user.name) {
    throw new AuthenticationError('Please complete your profile first');
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  userOnly,
  requireCompleteProfile,
};
