const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
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
    trim: true,
    maxlength: 500,
  },
  image: {
    url: String,
    publicId: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  productCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ name: 'text' });

// Pre-save hook to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Static method to update product count
categorySchema.statics.updateProductCount = async function(categoryId) {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ 
    category: categoryId, 
    isActive: true 
  });
  await this.findByIdAndUpdate(categoryId, { productCount: count });
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
