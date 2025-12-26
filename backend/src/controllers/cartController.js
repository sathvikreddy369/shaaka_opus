const { Cart, Product } = require('../models');
const { asyncHandler, sendResponse } = require('../utils/helpers');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req, res) => {
  // Use lean for faster reads, but we need methods so check existence first
  let cart = await Cart.findOne({ user: req.userId });

  if (!cart) {
    cart = await Cart.create({ user: req.userId, items: [] });
    return sendResponse(res, 200, {
      data: {
        cart: {
          _id: cart._id,
          items: [],
          invalidItems: [],
          itemCount: 0,
          subtotal: 0,
        },
      },
    });
  }

  // If cart is empty, return early
  if (cart.items.length === 0) {
    return sendResponse(res, 200, {
      data: {
        cart: {
          _id: cart._id,
          items: [],
          invalidItems: [],
          itemCount: 0,
          subtotal: 0,
        },
      },
    });
  }

  const { validatedItems, invalidItems } = await cart.validateAndGetPrices();

  // Calculate totals
  const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  sendResponse(res, 200, {
    data: {
      cart: {
        _id: cart._id,
        items: validatedItems,
        invalidItems,
        itemCount: validatedItems.length,
        subtotal,
      },
    },
  });
});

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/items
 * @access  Private
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantityOptionId, quantity = 1 } = req.body;

  // Validate product and quantity option
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw new NotFoundError('Product');
  }

  const quantityOption = product.quantityOptions.id(quantityOptionId);
  if (!quantityOption) {
    throw new NotFoundError('Quantity option');
  }

  // Check stock
  if (quantityOption.stock < quantity) {
    throw new ValidationError(`Only ${quantityOption.stock} items available in stock`);
  }

  // Get or create cart
  let cart = await Cart.findOne({ user: req.userId });
  if (!cart) {
    cart = await Cart.create({ user: req.userId, items: [] });
  }

  // Check existing quantity in cart
  const existingItem = cart.items.find(
    item => item.product.toString() === productId &&
            item.quantityOptionId.toString() === quantityOptionId
  );

  const totalQty = (existingItem?.quantity || 0) + quantity;
  if (totalQty > 10) {
    throw new ValidationError('Maximum 10 items per product allowed');
  }
  if (totalQty > quantityOption.stock) {
    throw new ValidationError(`Only ${quantityOption.stock} items available in stock`);
  }

  // Add to cart
  const priceSnapshot = {
    quantity: quantityOption.quantity,
    price: quantityOption.price,
    sellingPrice: quantityOption.sellingPrice,
  };

  await cart.addItem(productId, quantityOptionId, quantity, priceSnapshot);

  // Get updated cart with validation
  const { validatedItems, invalidItems } = await cart.validateAndGetPrices();
  const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  sendResponse(res, 200, {
    data: {
      cart: {
        _id: cart._id,
        items: validatedItems,
        invalidItems,
        itemCount: validatedItems.length,
        subtotal,
      },
    },
  }, 'Item added to cart');
});

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/items/:itemId
 * @access  Private
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) {
    throw new NotFoundError('Cart');
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new NotFoundError('Cart item');
  }

  // Validate stock
  if (quantity > 0) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new NotFoundError('Product');
    }

    const quantityOption = product.quantityOptions.id(item.quantityOptionId);
    if (!quantityOption) {
      throw new NotFoundError('Quantity option');
    }

    if (quantity > 10) {
      throw new ValidationError('Maximum 10 items per product allowed');
    }
    if (quantity > quantityOption.stock) {
      throw new ValidationError(`Only ${quantityOption.stock} items available in stock`);
    }
  }

  await cart.updateItemQuantity(itemId, quantity);

  // Get updated cart
  const { validatedItems, invalidItems } = await cart.validateAndGetPrices();
  const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  sendResponse(res, 200, {
    data: {
      cart: {
        _id: cart._id,
        items: validatedItems,
        invalidItems,
        itemCount: validatedItems.length,
        subtotal,
      },
    },
  }, quantity > 0 ? 'Cart updated' : 'Item removed from cart');
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:itemId
 * @access  Private
 */
const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) {
    throw new NotFoundError('Cart');
  }

  await cart.removeItem(itemId);

  // Get updated cart
  const { validatedItems, invalidItems } = await cart.validateAndGetPrices();
  const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  sendResponse(res, 200, {
    data: {
      cart: {
        _id: cart._id,
        items: validatedItems,
        invalidItems,
        itemCount: validatedItems.length,
        subtotal,
      },
    },
  }, 'Item removed from cart');
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId });
  if (cart) {
    await cart.clearCart();
  }

  sendResponse(res, 200, {
    data: {
      cart: {
        items: [],
        invalidItems: [],
        itemCount: 0,
        subtotal: 0,
      },
    },
  }, 'Cart cleared');
});

/**
 * @desc    Validate cart for checkout
 * @route   GET /api/cart/validate
 * @access  Private
 */
const validateCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId });
  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cart is empty');
  }

  const { validatedItems, invalidItems } = await cart.validateAndGetPrices();

  if (invalidItems.length > 0) {
    sendResponse(res, 400, {
      data: {
        isValid: false,
        validItems: validatedItems,
        invalidItems,
        message: 'Some items in your cart have issues',
      },
    });
    return;
  }

  const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  sendResponse(res, 200, {
    data: {
      isValid: true,
      items: validatedItems,
      subtotal,
    },
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
};
