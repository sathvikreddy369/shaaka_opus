const mongoose = require('mongoose');
const { Order, Product, User, AuditLog } = require('../models');
const { asyncHandler, sendResponse } = require('../utils/helpers');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const { period = 'today' } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(0);
  }

  // Order statistics
  const orderStats = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$total', 0],
          },
        },
        pendingOrders: {
          $sum: {
            $cond: [
              { $in: ['$status', ['PLACED', 'CONFIRMED', 'PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT']] },
              1,
              0,
            ],
          },
        },
        deliveredOrders: {
          $sum: {
            $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0],
          },
        },
        cancelledOrders: {
          $sum: {
            $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0],
          },
        },
      },
    },
  ]);

  // Orders by status
  const ordersByStatus = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Orders by payment method
  const ordersByPaymentMethod = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate }, paymentStatus: 'PAID' } },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
  ]);

  // Top selling products
  const topProducts = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate }, paymentStatus: 'PAID' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.productSnapshot.name' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
  ]);

  // Low stock products
  const lowStockProducts = await Product.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$quantityOptions' },
    { $match: { 'quantityOptions.stock': { $lte: 10 } } },
    {
      $project: {
        name: 1,
        slug: 1,
        quantity: '$quantityOptions.quantity',
        stock: '$quantityOptions.stock',
      },
    },
    { $sort: { stock: 1 } },
    { $limit: 10 },
  ]);

  // User statistics
  const userStats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        newUsers: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', startDate] }, 1, 0],
          },
        },
      },
    },
  ]);

  // Recent orders
  const recentOrders = await Order.find()
    .populate('user', 'name phone')
    .sort({ createdAt: -1 })
    .limit(10)
    .select('orderNumber user total status paymentStatus createdAt');

  const stats = orderStats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  };

  sendResponse(res, 200, {
    data: {
      overview: {
        ...stats,
        totalUsers: userStats[0]?.totalUsers || 0,
        newUsers: userStats[0]?.newUsers || 0,
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      ordersByPaymentMethod,
      topProducts,
      lowStockProducts,
      recentOrders,
    },
  });
});

/**
 * @desc    Get revenue analytics
 * @route   GET /api/admin/analytics/revenue
 * @access  Admin
 */
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month', groupBy = 'day' } = req.query;

  const now = new Date();
  let startDate;
  let dateFormat;

  switch (period) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      dateFormat = '%Y-%m-%d';
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      dateFormat = '%Y-%m-%d';
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      dateFormat = '%Y-%m-%d';
  }

  const revenueData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        paymentStatus: 'PAID',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: dateFormat, date: '$createdAt' },
        },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
        avgOrderValue: { $avg: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Compare with previous period
  const previousStartDate = new Date(startDate);
  previousStartDate.setTime(previousStartDate.getTime() - (now.getTime() - startDate.getTime()));

  const previousPeriodData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: previousStartDate, $lt: startDate },
        paymentStatus: 'PAID',
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
  ]);

  const currentTotal = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const previousTotal = previousPeriodData[0]?.revenue || 0;
  const growthRate = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  sendResponse(res, 200, {
    data: {
      chartData: revenueData,
      summary: {
        totalRevenue: currentTotal,
        totalOrders: revenueData.reduce((sum, item) => sum + item.orders, 0),
        avgOrderValue: currentTotal / (revenueData.reduce((sum, item) => sum + item.orders, 0) || 1),
        growthRate: Math.round(growthRate * 100) / 100,
        previousPeriodRevenue: previousTotal,
      },
    },
  });
});

/**
 * @desc    Get order analytics
 * @route   GET /api/admin/analytics/orders
 * @access  Admin
 */
const getOrderAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

  const now = new Date();
  let startDate;

  switch (period) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  // Order trends
  const orderTrends = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fulfillment rate
  const fulfillmentStats = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        delivered: {
          $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
        },
      },
    },
  ]);

  const fulfillment = fulfillmentStats[0] || { total: 0, delivered: 0, cancelled: 0 };
  const fulfillmentRate = fulfillment.total > 0 
    ? (fulfillment.delivered / fulfillment.total) * 100 
    : 0;
  const cancellationRate = fulfillment.total > 0 
    ? (fulfillment.cancelled / fulfillment.total) * 100 
    : 0;

  // Peak hours
  const peakHours = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  sendResponse(res, 200, {
    data: {
      orderTrends,
      fulfillmentRate: Math.round(fulfillmentRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      peakHours,
    },
  });
});

/**
 * @desc    Get product analytics
 * @route   GET /api/admin/analytics/products
 * @access  Admin
 */
const getProductAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

  const now = new Date();
  let startDate;

  switch (period) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  // Best sellers
  const bestSellers = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate }, paymentStatus: 'PAID' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.productSnapshot.name' },
        image: { $first: '$items.productSnapshot.image' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  // Category performance
  const categoryPerformance = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate }, paymentStatus: 'PAID' } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.category',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category._id',
        name: { $first: '$category.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  // Stock overview
  const stockOverview = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        outOfStock: {
          $sum: { $cond: [{ $eq: ['$isOutOfStock', true] }, 1, 0] },
        },
        lowStock: {
          $sum: { $cond: [{ $lte: ['$totalStock', 10] }, 1, 0] },
        },
      },
    },
  ]);

  sendResponse(res, 200, {
    data: {
      bestSellers,
      categoryPerformance,
      stockOverview: stockOverview[0] || {
        totalProducts: 0,
        outOfStock: 0,
        lowStock: 0,
      },
    },
  });
});

/**
 * @desc    Get audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Admin
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    action,
    entityType,
    admin,
    startDate,
    endDate,
  } = req.query;

  const filter = {};

  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (admin) filter.admin = admin;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('admin', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    AuditLog.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: {
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
      },
    },
  });
});

/**
 * @desc    Get all users (admin)
 * @route   GET /api/admin/users
 * @access  Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    search,
    isActive,
    sort = '-createdAt',
  } = req.query;

  const filter = {};

  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-refreshTokens'),
    User.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
      },
    },
  });
});

/**
 * @desc    Create admin user
 * @route   POST /api/admin/users/create-admin
 * @access  Admin
 */
const createAdmin = asyncHandler(async (req, res) => {
  const { phone, name, email } = req.body;

  // Check if user already exists
  let user = await User.findOne({ phone });

  if (user) {
    if (user.role === 'ADMIN') {
      throw new Error('User is already an admin');
    }
    user.role = 'ADMIN';
    await user.save();
  } else {
    user = await User.create({
      phone,
      name,
      email,
      role: 'ADMIN',
      isProfileComplete: true,
    });
  }

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'ADMIN_CREATE',
    entityType: 'User',
    entityId: user._id,
    entityName: user.name || user.phone,
    newValue: { phone, name, email, role: 'ADMIN' },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 201, {
    data: { user },
  }, 'Admin created');
});

/**
 * @desc    Toggle user active status
 * @route   PUT /api/admin/users/:userId/toggle-active
 * @access  Admin
 */
const toggleUserActive = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Prevent deactivating self
  if (user._id.toString() === req.userId.toString()) {
    throw new Error('Cannot deactivate your own account');
  }

  user.isActive = !user.isActive;
  await user.save();

  // Audit log
  await AuditLog.log({
    admin: req.userId,
    action: 'USER_STATUS_CHANGE',
    entityType: 'User',
    entityId: user._id,
    entityName: user.name || user.phone,
    previousValue: { isActive: !user.isActive },
    newValue: { isActive: user.isActive },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendResponse(res, 200, {
    data: { user },
  }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
});

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getOrderAnalytics,
  getProductAnalytics,
  getAuditLogs,
  getUsers,
  createAdmin,
  toggleUserActive,
};
