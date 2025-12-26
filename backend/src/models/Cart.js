const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantityOptionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  // Snapshot of price at time of adding to cart (for reference, not for checkout)
  priceSnapshot: {
    quantity: String,
    price: Number,
    sellingPrice: Number,
  },
}, { _id: true, timestamps: true });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  lastModified: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
cartSchema.index({ user: 1 });
cartSchema.index({ 'items.product': 1 });
cartSchema.index({ lastModified: -1 });

// Method to add item to cart
cartSchema.methods.addItem = async function(productId, quantityOptionId, quantity, priceSnapshot) {
  const existingItemIndex = this.items.findIndex(
    item => item.product.toString() === productId.toString() &&
            item.quantityOptionId.toString() === quantityOptionId.toString()
  );
  
  if (existingItemIndex > -1) {
    this.items[existingItemIndex].quantity = Math.min(
      this.items[existingItemIndex].quantity + quantity,
      10
    );
    this.items[existingItemIndex].priceSnapshot = priceSnapshot;
  } else {
    this.items.push({
      product: productId,
      quantityOptionId,
      quantity,
      priceSnapshot,
    });
  }
  
  this.lastModified = new Date();
  await this.save();
  return this;
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = async function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  if (quantity <= 0) {
    this.items.pull(itemId);
  } else {
    item.quantity = Math.min(quantity, 10);
  }
  
  this.lastModified = new Date();
  await this.save();
  return this;
};

// Method to remove item from cart
cartSchema.methods.removeItem = async function(itemId) {
  this.items.pull(itemId);
  this.lastModified = new Date();
  await this.save();
  return this;
};

// Method to clear cart
cartSchema.methods.clearCart = async function() {
  this.items = [];
  this.lastModified = new Date();
  await this.save();
  return this;
};

// Method to validate and get current prices - optimized with batch query
cartSchema.methods.validateAndGetPrices = async function() {
  const Product = mongoose.model('Product');
  const validatedItems = [];
  const invalidItems = [];
  
  // Get all unique product IDs
  const productIds = [...new Set(this.items.map(item => item.product.toString()))];
  
  // Single query to fetch all products
  const products = await Product.find({
    _id: { $in: productIds }
  })
    .select('name slug images quantityOptions isActive')
    .lean();
  
  // Create a map for O(1) lookup
  const productMap = new Map(products.map(p => [p._id.toString(), p]));
  
  for (const item of this.items) {
    const product = productMap.get(item.product.toString());
    
    if (!product || !product.isActive) {
      invalidItems.push({
        itemId: item._id,
        reason: 'Product not available',
      });
      continue;
    }
    
    const quantityOption = product.quantityOptions.find(
      opt => opt._id.toString() === item.quantityOptionId.toString()
    );
    
    if (!quantityOption) {
      invalidItems.push({
        itemId: item._id,
        reason: 'Quantity option not available',
      });
      continue;
    }
    
    if (quantityOption.stock < item.quantity) {
      if (quantityOption.stock === 0) {
        invalidItems.push({
          itemId: item._id,
          reason: 'Out of stock',
        });
      } else {
        invalidItems.push({
          itemId: item._id,
          reason: `Only ${quantityOption.stock} available`,
          availableStock: quantityOption.stock,
        });
      }
      continue;
    }
    
    // Get primary image
    const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0] || null;
    
    validatedItems.push({
      itemId: item._id,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        image: primaryImage,
      },
      quantityOption: {
        _id: quantityOption._id,
        quantity: quantityOption.quantity,
        price: quantityOption.price,
        sellingPrice: quantityOption.sellingPrice,
        stock: quantityOption.stock,
      },
      quantity: item.quantity,
      subtotal: quantityOption.sellingPrice * item.quantity,
      priceChanged: item.priceSnapshot?.sellingPrice !== quantityOption.sellingPrice,
    });
  }
  
  return { validatedItems, invalidItems };
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
