const { Category, Product, AuditLog } = require('../models');
const { asyncHandler, sendResponse, getPaginationData } = require('../utils/helpers');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { deleteImage, getPublicIdFromUrl } = require('../config/cloudinary');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const { active } = req.query;
  
  const filter = {};
  if (active !== undefined) {
    filter.isActive = active === 'true';
  }

  const categories = await Category.find(filter)
    .sort({ displayOrder: 1, name: 1 });

  sendResponse(res, 200, {
    data: { categories },
  });
});

/**
 * @desc    Get single category
 * @route   GET /api/categories/:slug
 * @access  Public
 */
const getCategory = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const category = await Category.findOne({ slug });
  if (!category) {
    throw new NotFoundError('Category');
  }

  sendResponse(res, 200, {
    data: { category },
  });
});

/**
 * @desc    Create category
 * @route   POST /api/admin/categories
 * @access  Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, displayOrder } = req.body;

  // Check if category exists
  const existing = await Category.findOne({ 
    name: { $regex: new RegExp(`^${name}$`, 'i') } 
  });
  if (existing) {
    throw new ConflictError('Category with this name already exists');
  }

  const categoryData = { name, description, displayOrder };

  // Handle image upload
  if (req.file) {
    categoryData.image = {
      url: req.file.path,
      publicId: req.file.filename,
    };
  }

  const category = await Category.create(categoryData);

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'CATEGORY_CREATE',
    entityType: 'Category',
    entityId: category._id,
    entityName: category.name,
    newValue: categoryData,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 201, {
    data: { category },
  }, 'Category created');
});

/**
 * @desc    Update category
 * @route   PUT /api/admin/categories/:id
 * @access  Admin
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, displayOrder, isActive } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    throw new NotFoundError('Category');
  }

  const previousValue = category.toObject();

  // Check for duplicate name
  if (name && name !== category.name) {
    const existing = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id },
    });
    if (existing) {
      throw new ConflictError('Category with this name already exists');
    }
    category.name = name;
    category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  if (description !== undefined) category.description = description;
  if (displayOrder !== undefined) category.displayOrder = displayOrder;
  if (isActive !== undefined) category.isActive = isActive;

  // Handle image upload
  if (req.file) {
    // Delete old image
    if (category.image?.publicId) {
      await deleteImage(category.image.publicId);
    }
    category.image = {
      url: req.file.path,
      publicId: req.file.filename,
    };
  }

  await category.save();

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'CATEGORY_UPDATE',
    entityType: 'Category',
    entityId: category._id,
    entityName: category.name,
    previousValue,
    newValue: category.toObject(),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, {
    data: { category },
  }, 'Category updated');
});

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 * @access  Admin
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    throw new NotFoundError('Category');
  }

  // Check if category has products
  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw new ConflictError(`Cannot delete category with ${productCount} products`);
  }

  // Delete image
  if (category.image?.publicId) {
    await deleteImage(category.image.publicId);
  }

  await Category.findByIdAndDelete(id);

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'CATEGORY_DELETE',
    entityType: 'Category',
    entityId: category._id,
    entityName: category.name,
    previousValue: category.toObject(),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, {}, 'Category deleted');
});

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
