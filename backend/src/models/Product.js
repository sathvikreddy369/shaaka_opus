const mongoose = require('mongoose');

const quantityOptionSchema = new mongoose.Schema({
  quantity: {
    type: String,
    required: true,
    trim: true, // e.g., "250g", "500g", "1kg"
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discountFlat: {
    type: Number,
    default: 0,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  sku: {
    type: String,
    trim: true,
  },
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  constituents: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  images: [{
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  }],
  quantityOptions: {
    type: [quantityOptionSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one quantity option is required',
    },
  },
  // Aggregate fields for easy querying
  minPrice: {
    type: Number,
    min: 0,
  },
  maxPrice: {
    type: Number,
    min: 0,
  },
  totalStock: {
    type: Number,
    default: 0,
    min: 0,
  },
  isOutOfStock: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Rating
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // SEO
  metaTitle: {
    type: String,
    trim: true,
    maxlength: 70,
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160,
  },
  // Featured
  isFeatured: {
    type: Boolean,
    default: false,
  },
  // Sales tracking
  totalSales: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Indexes (slug already indexed via unique: true in schema)
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ minPrice: 1, maxPrice: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ totalSales: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Pre-save hook to calculate aggregate fields and generate slug
productSchema.pre('save', function(next) {
  // Generate slug from name
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Calculate min/max prices and total stock
  if (this.quantityOptions && this.quantityOptions.length > 0) {
    const prices = this.quantityOptions.map(opt => opt.sellingPrice);
    this.minPrice = Math.min(...prices);
    this.maxPrice = Math.max(...prices);
    this.totalStock = this.quantityOptions.reduce((sum, opt) => sum + opt.stock, 0);
    this.isOutOfStock = this.totalStock === 0;
    
    // Calculate selling prices for each option
    this.quantityOptions.forEach(opt => {
      let discount = 0;
      if (opt.discountPercent > 0) {
        discount = (opt.price * opt.discountPercent) / 100;
      }
      discount += opt.discountFlat || 0;
      opt.sellingPrice = Math.max(0, opt.price - discount);
    });
  }
  
  // Ensure at least one primary image
  if (this.images && this.images.length > 0) {
    const hasPrimary = this.images.some(img => img.isPrimary);
    if (!hasPrimary) {
      this.images[0].isPrimary = true;
    }
  }
  
  next();
});

// Method to get primary image
productSchema.methods.getPrimaryImage = function() {
  return this.images.find(img => img.isPrimary) || this.images[0];
};

// Method to check stock for a specific quantity option
productSchema.methods.checkStock = function(quantityOptionId, requestedQty) {
  const option = this.quantityOptions.id(quantityOptionId);
  if (!option) return { available: false, message: 'Quantity option not found' };
  if (option.stock < requestedQty) {
    return { available: false, message: `Only ${option.stock} items available`, stock: option.stock };
  }
  return { available: true, stock: option.stock };
};

// Static method to update rating
productSchema.statics.updateRating = async function(productId) {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  
  if (stats.length > 0) {
    await this.findByIdAndUpdate(productId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount,
    });
  } else {
    await this.findByIdAndUpdate(productId, {
      averageRating: 0,
      reviewCount: 0,
    });
  }
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
