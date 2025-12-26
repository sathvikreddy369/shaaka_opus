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

// Indexes (user already indexed via unique: true in schema)
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

// Method to get wishlist with current product details - optimized single query
wishlistSchema.methods.getWithDetails = async function() {
  const Product = mongoose.model('Product');
  
  // Get all product IDs from wishlist
  const productIds = this.items.map(item => item.product);
  
  // Single query to fetch all products
  const products = await Product.find({
    _id: { $in: productIds }
  })
    .select('name slug images quantityOptions minPrice maxPrice isActive isOutOfStock')
    .lean();
  
  // Create a map for O(1) lookup
  const productMap = new Map(products.map(p => [p._id.toString(), p]));
  
  const items = [];
  
  for (const item of this.items) {
    const product = productMap.get(item.product.toString());
    
    if (!product) {
      continue;
    }
    
    // Get primary image
    const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0] || null;
    
    items.push({
      _id: item._id,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        image: primaryImage,
        images: product.images,
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
