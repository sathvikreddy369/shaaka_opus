const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    enum: ['Home', 'Office', 'Other'],
    default: 'Home',
  },
  houseNumber: {
    type: String,
    required: true,
    trim: true,
  },
  street: {
    type: String,
    required: true,
    trim: true,
  },
  colony: {
    type: String,
    required: true,
    trim: true,
  },
  landmark: {
    type: String,
    trim: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number'],
  },
  name: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER',
  },
  addresses: [addressSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  isProfileComplete: {
    type: Boolean,
    default: false,
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800, // 7 days in seconds
    },
  }],
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.refreshTokens;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Methods
userSchema.methods.addRefreshToken = async function(token) {
  this.refreshTokens.push({ token });
  // Keep only last 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  await this.save();
};

userSchema.methods.removeRefreshToken = async function(token) {
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
  await this.save();
};

userSchema.methods.removeAllRefreshTokens = async function() {
  this.refreshTokens = [];
  await this.save();
};

userSchema.methods.hasRefreshToken = function(token) {
  return this.refreshTokens.some(t => t.token === token);
};

userSchema.methods.setDefaultAddress = async function(addressId) {
  this.addresses.forEach(addr => {
    addr.isDefault = addr._id.toString() === addressId.toString();
  });
  await this.save();
};

userSchema.methods.getDefaultAddress = function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

const User = mongoose.model('User', userSchema);

module.exports = User;
