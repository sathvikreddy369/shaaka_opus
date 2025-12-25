const mongoose = require('mongoose');
const { Product, Category, AuditLog } = require('../models');
const { asyncHandler, sendResponse, getPaginationData, buildSortObject } = require('../utils/helpers');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { deleteImage } = require('../config/cloudinary');

/**
 * @desc    Get all products with filters, sorting, and pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    category,
    search,
    minPrice,
    maxPrice,
    inStock,
    featured,
    sort,
  } = req.query;

  const filter = { isActive: true };

  // Category filter
  if (category) {
    const categoryDoc = await Category.findOne({ slug: category });
    if (categoryDoc) {
      filter.category = categoryDoc._id;
    }
  }

  // Search filter
  if (search) {
    filter.$text = { $search: search };
  }

  // Price filter
  if (minPrice || maxPrice) {
    filter.minPrice = {};
    if (minPrice) filter.minPrice.$gte = parseFloat(minPrice);
    if (maxPrice) filter.minPrice.$lte = parseFloat(maxPrice);
  }

  // Stock filter
  if (inStock === 'true') {
    filter.isOutOfStock = false;
  }

  // Featured filter
  if (featured === 'true') {
    filter.isFeatured = true;
  }

  // Sort
  let sortObj = { createdAt: -1 };
  if (sort) {
    const sortMap = {
      'price-asc': { minPrice: 1 },
      'price-desc': { minPrice: -1 },
      'rating': { averageRating: -1 },
      'newest': { createdAt: -1 },
      'popular': { totalSales: -1 },
    };
    sortObj = sortMap[sort] || sortObj;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .select('-__v')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    Product.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: {
      products,
      pagination: getPaginationData(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Get single product by slug
 * @route   GET /api/products/:slug
 * @access  Public
 */
const getProduct = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const product = await Product.findOne({ slug, isActive: true })
    .populate('category', 'name slug');

  if (!product) {
    throw new NotFoundError('Product');
  }

  sendResponse(res, 200, {
    data: { product },
  });
});

/**
 * @desc    Get product by ID
 * @route   GET /api/products/id/:id
 * @access  Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id)
    .populate('category', 'name slug');

  if (!product) {
    throw new NotFoundError('Product');
  }

  sendResponse(res, 200, {
    data: { product },
  });
});

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const products = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  sendResponse(res, 200, {
    data: { products },
  });
});

/**
 * @desc    Get related products
 * @route   GET /api/products/:slug/related
 * @access  Public
 */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { limit = 4 } = req.query;

  const product = await Product.findOne({ slug });
  if (!product) {
    throw new NotFoundError('Product');
  }

  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true,
  })
    .populate('category', 'name slug')
    .sort({ averageRating: -1, totalSales: -1 })
    .limit(parseInt(limit));

  sendResponse(res, 200, {
    data: { products: relatedProducts },
  });
});

// Admin controllers

/**
 * @desc    Get all products (admin)
 * @route   GET /api/admin/products
 * @access  Admin
 */
const getAdminProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    search,
    isActive,
    isOutOfStock,
    sort = '-createdAt',
  } = req.query;

  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  if (isOutOfStock !== undefined) {
    filter.isOutOfStock = isOutOfStock === 'true';
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = buildSortObject(sort);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    Product.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: {
      products,
      pagination: getPaginationData(parseInt(page), parseInt(limit), total),
    },
  });
});

/**
 * @desc    Create product
 * @route   POST /api/admin/products
 * @access  Admin
 */
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    constituents,
    category,
    quantityOptions,
    metaTitle,
    metaDescription,
    isFeatured,
  } = req.body;

  // Verify category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new NotFoundError('Category');
  }

  // Parse quantity options if string
  let parsedOptions = quantityOptions;
  if (typeof quantityOptions === 'string') {
    parsedOptions = JSON.parse(quantityOptions);
  }

  // Calculate selling prices
  parsedOptions = parsedOptions.map(opt => {
    let discount = 0;
    if (opt.discountPercent > 0) {
      discount = (opt.price * opt.discountPercent) / 100;
    }
    discount += opt.discountFlat || 0;
    return {
      ...opt,
      sellingPrice: Math.max(0, opt.price - discount),
    };
  });

  // Generate unique slug
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existingSlug = await Product.findOne({ slug });
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  const productData = {
    name,
    slug,
    description,
    constituents,
    category,
    quantityOptions: parsedOptions,
    metaTitle,
    metaDescription,
    isFeatured: isFeatured === 'true' || isFeatured === true,
    images: [],
  };

  // Handle image uploads
  if (req.files && req.files.length > 0) {
    productData.images = req.files.map((file, index) => ({
      url: file.path,
      publicId: file.filename,
      isPrimary: index === 0,
    }));
  }

  const product = await Product.create(productData);

  // Update category product count
  await Category.updateProductCount(category);

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'PRODUCT_CREATE',
    entityType: 'Product',
    entityId: product._id,
    entityName: product.name,
    newValue: productData,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 201, {
    data: { product },
  }, 'Product created');
});

/**
 * @desc    Update product
 * @route   PUT /api/admin/products/:id
 * @access  Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const product = await Product.findById(id);
  if (!product) {
    throw new NotFoundError('Product');
  }

  const previousValue = product.toObject();

  // Track price changes for audit
  let priceChanged = false;
  let stockChanged = false;

  // Update fields
  const allowedFields = [
    'name', 'description', 'constituents', 'category',
    'metaTitle', 'metaDescription', 'isFeatured', 'isActive',
  ];

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      product[field] = updates[field];
    }
  });

  // Handle quantity options update
  if (updates.quantityOptions) {
    let parsedOptions = updates.quantityOptions;
    if (typeof parsedOptions === 'string') {
      parsedOptions = JSON.parse(parsedOptions);
    }

    // Check for price/stock changes
    parsedOptions.forEach(newOpt => {
      const oldOpt = product.quantityOptions.find(
        o => o._id?.toString() === newOpt._id?.toString()
      );
      if (oldOpt) {
        if (oldOpt.price !== newOpt.price || oldOpt.sellingPrice !== newOpt.sellingPrice) {
          priceChanged = true;
        }
        if (oldOpt.stock !== newOpt.stock) {
          stockChanged = true;
        }
      }
    });

    // Calculate selling prices
    product.quantityOptions = parsedOptions.map(opt => {
      let discount = 0;
      if (opt.discountPercent > 0) {
        discount = (opt.price * opt.discountPercent) / 100;
      }
      discount += opt.discountFlat || 0;
      return {
        ...opt,
        sellingPrice: Math.max(0, opt.price - discount),
      };
    });
  }

  // Handle new image uploads
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(file => ({
      url: file.path,
      publicId: file.filename,
      isPrimary: false,
    }));

    // Limit to 5 images
    const totalImages = product.images.length + newImages.length;
    if (totalImages > 5) {
      throw new ValidationError('Maximum 5 images allowed per product');
    }

    product.images.push(...newImages);
  }

  // Handle image deletion
  if (updates.deleteImages) {
    const deleteIds = Array.isArray(updates.deleteImages) 
      ? updates.deleteImages 
      : [updates.deleteImages];

    for (const imageId of deleteIds) {
      const image = product.images.id(imageId);
      if (image) {
        await deleteImage(image.publicId);
        product.images.pull(imageId);
      }
    }
  }

  // Handle primary image change
  if (updates.primaryImage) {
    product.images.forEach(img => {
      img.isPrimary = img._id.toString() === updates.primaryImage;
    });
  }

  await product.save();

  // Update category product count if category changed
  if (updates.category && updates.category !== previousValue.category.toString()) {
    await Category.updateProductCount(previousValue.category);
    await Category.updateProductCount(updates.category);
  }

  // Audit logs
  if (priceChanged) {
    await AuditLog.log({
      admin: req.userId,
      action: 'PRODUCT_PRICE_CHANGE',
      entityType: 'Product',
      entityId: product._id,
      entityName: product.name,
      previousValue: previousValue.quantityOptions,
      newValue: product.quantityOptions,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  if (stockChanged) {
    await AuditLog.log({
      admin: req.userId,
      action: 'PRODUCT_STOCK_UPDATE',
      entityType: 'Product',
      entityId: product._id,
      entityName: product.name,
      previousValue: previousValue.quantityOptions,
      newValue: product.quantityOptions,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  await AuditLog.log({
    admin: req.userId,
    action: 'PRODUCT_UPDATE',
    entityType: 'Product',
    entityId: product._id,
    entityName: product.name,
    previousValue,
    newValue: product.toObject(),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  await product.populate('category', 'name slug');

  sendResponse(res, 200, {
    data: { product },
  }, 'Product updated');
});

/**
 * @desc    Delete product
 * @route   DELETE /api/admin/products/:id
 * @access  Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new NotFoundError('Product');
  }

  // Delete all images
  for (const image of product.images) {
    await deleteImage(image.publicId);
  }

  const categoryId = product.category;
  await Product.findByIdAndDelete(id);

  // Update category product count
  await Category.updateProductCount(categoryId);

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'PRODUCT_DELETE',
    entityType: 'Product',
    entityId: product._id,
    entityName: product.name,
    previousValue: product.toObject(),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, {}, 'Product deleted');
});

/**
 * @desc    Update product stock
 * @route   PUT /api/admin/products/:id/stock
 * @access  Admin
 */
const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantityOptionId, stock } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    throw new NotFoundError('Product');
  }

  const option = product.quantityOptions.id(quantityOptionId);
  if (!option) {
    throw new NotFoundError('Quantity option');
  }

  const previousStock = option.stock;
  option.stock = stock;

  await product.save();

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'PRODUCT_STOCK_UPDATE',
    entityType: 'Product',
    entityId: product._id,
    entityName: `${product.name} - ${option.quantity}`,
    previousValue: { stock: previousStock },
    newValue: { stock },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, {
    data: { product },
  }, 'Stock updated');
});

/**
 * @desc    Toggle product active status
 * @route   PUT /api/admin/products/:id/toggle-active
 * @access  Admin
 */
const toggleActive = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new NotFoundError('Product');
  }

  product.isActive = !product.isActive;
  await product.save();

  // Update category product count
  await Category.updateProductCount(product.category);

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'PRODUCT_STATUS_CHANGE',
    entityType: 'Product',
    entityId: product._id,
    entityName: product.name,
    previousValue: { isActive: !product.isActive },
    newValue: { isActive: product.isActive },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, {
    data: { product },
  }, `Product ${product.isActive ? 'activated' : 'deactivated'}`);
});

/**
 * @desc    Get low stock products
 * @route   GET /api/admin/products/low-stock
 * @access  Admin
 */
const getLowStockProducts = asyncHandler(async (req, res) => {
  const { threshold = 10 } = req.query;

  const products = await Product.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$quantityOptions' },
    { $match: { 'quantityOptions.stock': { $lte: parseInt(threshold) } } },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        slug: { $first: '$slug' },
        category: { $first: '$category' },
        lowStockOptions: {
          $push: {
            quantity: '$quantityOptions.quantity',
            stock: '$quantityOptions.stock',
          },
        },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    { $sort: { 'lowStockOptions.stock': 1 } },
  ]);

  sendResponse(res, 200, {
    data: { products, count: products.length },
  });
});

module.exports = {
  getProducts,
  getProduct,
  getProductById,
  getFeaturedProducts,
  getRelatedProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  toggleActive,
  getLowStockProducts,
};
