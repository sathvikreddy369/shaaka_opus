const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { uploadCategoryImage } = require('../config/cloudinary');
const { validate, categoryValidation, mongoIdValidation } = require('../middleware/validators');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:slug', categoryController.getCategory);

// Admin routes (these are mounted at /api/admin/categories in admin routes)

module.exports = router;

// Export admin routes separately
module.exports.adminRoutes = express.Router();

module.exports.adminRoutes.post(
  '/',
  authenticate,
  adminOnly,
  uploadCategoryImage.single('image'),
  categoryValidation,
  validate,
  categoryController.createCategory
);

module.exports.adminRoutes.put(
  '/:id',
  authenticate,
  adminOnly,
  uploadCategoryImage.single('image'),
  mongoIdValidation(),
  validate,
  categoryController.updateCategory
);

module.exports.adminRoutes.delete(
  '/:id',
  authenticate,
  adminOnly,
  mongoIdValidation(),
  validate,
  categoryController.deleteCategory
);
