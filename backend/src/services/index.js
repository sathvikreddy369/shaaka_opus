/**
 * Services index
 * Export all service modules
 */

const { cacheService, cacheKeys, CACHE_TTL } = require('./cacheService');
const productService = require('./productService');
const orderService = require('./orderService');
const cartService = require('./cartService');
const categoryService = require('./categoryService');
const userService = require('./userService');
const notificationService = require('./notificationService');

module.exports = {
  cacheService,
  cacheKeys,
  CACHE_TTL,
  productService,
  orderService,
  cartService,
  categoryService,
  userService,
  notificationService,
};
