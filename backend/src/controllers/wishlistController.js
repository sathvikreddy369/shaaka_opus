const { Wishlist, Product } = require('../models');
const { asyncHandler, sendResponse } = require('../utils/helpers');
const { NotFoundError } = require('../utils/errors');

/**
 * @desc    Get user's wishlist
 * @route   GET /api/wishlist
 * @access  Private
 */
const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.userId, items: [] });
  }

  const items = await wishlist.getWithDetails();

  sendResponse(res, 200, {
    data: {
      wishlist: {
        _id: wishlist._id,
        items,
        itemCount: items.length,
      },
    },
  });
});

/**
 * @desc    Add item to wishlist
 * @route   POST /api/wishlist/items
 * @access  Private
 */
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  // Validate product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  // Get or create wishlist
  let wishlist = await Wishlist.findOne({ user: req.userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.userId, items: [] });
  }

  // Add to wishlist
  const priceSnapshot = {
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
  };

  await wishlist.addItem(productId, priceSnapshot);

  const items = await wishlist.getWithDetails();

  sendResponse(res, 200, {
    data: {
      wishlist: {
        _id: wishlist._id,
        items,
        itemCount: items.length,
      },
    },
  }, 'Item added to wishlist');
});

/**
 * @desc    Remove item from wishlist
 * @route   DELETE /api/wishlist/items/:productId
 * @access  Private
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.userId });
  if (!wishlist) {
    throw new NotFoundError('Wishlist');
  }

  await wishlist.removeItem(productId);

  const items = await wishlist.getWithDetails();

  sendResponse(res, 200, {
    data: {
      wishlist: {
        _id: wishlist._id,
        items,
        itemCount: items.length,
      },
    },
  }, 'Item removed from wishlist');
});

/**
 * @desc    Check if product is in wishlist
 * @route   GET /api/wishlist/check/:productId
 * @access  Private
 */
const checkWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.userId });
  const inWishlist = wishlist ? wishlist.hasProduct(productId) : false;

  sendResponse(res, 200, {
    data: { inWishlist },
  });
});

/**
 * @desc    Clear wishlist
 * @route   DELETE /api/wishlist
 * @access  Private
 */
const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.userId });
  if (wishlist) {
    wishlist.items = [];
    await wishlist.save();
  }

  sendResponse(res, 200, {
    data: {
      wishlist: {
        items: [],
        itemCount: 0,
      },
    },
  }, 'Wishlist cleared');
});

/**
 * @desc    Move item from wishlist to cart
 * @route   POST /api/wishlist/move-to-cart
 * @access  Private
 */
const moveToCart = asyncHandler(async (req, res) => {
  const { productId, quantityOptionId, quantity = 1 } = req.body;
  const Cart = require('../models').Cart;

  // Validate product
  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product');
  }

  const quantityOption = product.quantityOptions.id(quantityOptionId);
  if (!quantityOption) {
    throw new NotFoundError('Quantity option');
  }

  // Get or create cart
  let cart = await Cart.findOne({ user: req.userId });
  if (!cart) {
    cart = await Cart.create({ user: req.userId, items: [] });
  }

  // Add to cart
  const priceSnapshot = {
    quantity: quantityOption.quantity,
    price: quantityOption.price,
    sellingPrice: quantityOption.sellingPrice,
  };

  await cart.addItem(productId, quantityOptionId, quantity, priceSnapshot);

  // Remove from wishlist
  const wishlist = await Wishlist.findOne({ user: req.userId });
  if (wishlist) {
    await wishlist.removeItem(productId);
  }

  sendResponse(res, 200, {}, 'Item moved to cart');
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist,
  moveToCart,
};
