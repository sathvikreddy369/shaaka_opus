const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  // Snapshot of price when added (to track price changes)
  priceSnapshot: {
    minPrice: Number,
    maxPrice: Number,
  },
}, { _id: true });

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [wishlistItemSchema],
}, {
  timestamps: true,
});

// Indexes
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'items.product': 1 });

// Method to add item to wishlist
wishlistSchema.methods.addItem = async function(productId, priceSnapshot) {
  const existingItem = this.items.find(
    item => item.product.toString() === productId.toString()
  );
  
  if (existingItem) {
    return this; // Already in wishlist
  }
  
  this.items.push({
    product: productId,
    priceSnapshot,
  });
  
  await this.save();
  return this;
};

// Method to remove item from wishlist
wishlistSchema.methods.removeItem = async function(productId) {
  this.items = this.items.filter(
    item => item.product.toString() !== productId.toString()
  );
  await this.save();
  return this;
};

// Method to check if product is in wishlist
wishlistSchema.methods.hasProduct = function(productId) {
  return this.items.some(
    item => item.product.toString() === productId.toString()
  );
};

// Method to get wishlist with current product details
wishlistSchema.methods.getWithDetails = async function() {
  const Product = mongoose.model('Product');
  const items = [];
  
  for (const item of this.items) {
    const product = await Product.findById(item.product)
      .select('name slug images quantityOptions minPrice maxPrice isActive isOutOfStock');
    
    if (!product) {
      continue;
    }
    
    items.push({
      _id: item._id,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        image: product.getPrimaryImage(),
        minPrice: product.minPrice,
        maxPrice: product.maxPrice,
        isActive: product.isActive,
        isOutOfStock: product.isOutOfStock,
        quantityOptions: product.quantityOptions,
      },
      addedAt: item.addedAt,
      priceChanged: item.priceSnapshot?.minPrice !== product.minPrice,
      priceIncreased: product.minPrice > (item.priceSnapshot?.minPrice || 0),
      priceDecreased: product.minPrice < (item.priceSnapshot?.minPrice || Infinity),
    });
  }
  
  return items;
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
