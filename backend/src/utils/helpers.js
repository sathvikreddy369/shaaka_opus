/**
 * Async handler wrapper to avoid try-catch in every controller
 * @param {Function} fn - Async controller function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Response helper for consistent API responses
 */
const sendResponse = (res, statusCode, data, message = null) => {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    ...(message && { message }),
    ...data,
  };
  return res.status(statusCode).json(response);
};

/**
 * Pagination helper
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 */
const getPaginationData = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Build sort object from query string
 * @param {string} sortString - Sort string (e.g., "-price,name")
 * @returns {object} MongoDB sort object
 */
const buildSortObject = (sortString, defaultSort = { createdAt: -1 }) => {
  if (!sortString) return defaultSort;

  const sortObj = {};
  const fields = sortString.split(',');

  fields.forEach((field) => {
    const order = field.startsWith('-') ? -1 : 1;
    const fieldName = field.replace(/^-/, '');
    sortObj[fieldName] = order;
  });

  return sortObj;
};

/**
 * Build filter object from query params
 * @param {object} query - Express query object
 * @param {array} allowedFields - Array of allowed filter fields
 * @returns {object} MongoDB filter object
 */
const buildFilterObject = (query, allowedFields) => {
  const filter = {};

  allowedFields.forEach((field) => {
    if (query[field] !== undefined) {
      filter[field] = query[field];
    }
  });

  return filter;
};

/**
 * Sanitize input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate slug from string
 * @param {string} str - Input string
 * @returns {string} URL-friendly slug
 */
const generateSlug = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Format price for display
 * @param {number} price - Price in base units
 * @returns {string} Formatted price
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
};

/**
 * Calculate percentage discount
 * @param {number} originalPrice - Original price
 * @param {number} sellingPrice - Selling price
 * @returns {number} Discount percentage
 */
const calculateDiscountPercent = (originalPrice, sellingPrice) => {
  if (originalPrice <= 0) return 0;
  const discount = ((originalPrice - sellingPrice) / originalPrice) * 100;
  return Math.round(discount);
};

module.exports = {
  asyncHandler,
  sendResponse,
  getPaginationData,
  buildSortObject,
  buildFilterObject,
  sanitizeInput,
  generateSlug,
  formatPrice,
  calculateDiscountPercent,
};
