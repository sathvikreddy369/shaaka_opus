const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number'],
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['LOGIN', 'SIGNUP', 'VERIFY'],
    default: 'LOGIN',
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index - document will be deleted after expiry
  },
}, {
  timestamps: true,
});

// Index for efficient queries
otpSchema.index({ phone: 1, purpose: 1 });
otpSchema.index({ createdAt: 1 });

// Static method to generate OTP
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to create OTP with expiry
otpSchema.statics.createOTP = async function(phone, purpose = 'LOGIN') {
  // Delete any existing OTPs for this phone and purpose
  await this.deleteMany({ phone, purpose });
  
  const otp = this.generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  const otpDoc = await this.create({
    phone,
    otp,
    purpose,
    expiresAt,
  });
  
  return otpDoc;
};

// Method to verify OTP
otpSchema.statics.verifyOTP = async function(phone, otp, purpose = 'LOGIN') {
  const otpDoc = await this.findOne({
    phone,
    purpose,
    expiresAt: { $gt: new Date() },
  });
  
  if (!otpDoc) {
    return { success: false, message: 'OTP expired or not found' };
  }
  
  if (otpDoc.attempts >= 5) {
    return { success: false, message: 'Maximum attempts exceeded' };
  }
  
  if (otpDoc.otp !== otp) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    return { success: false, message: 'Invalid OTP' };
  }
  
  otpDoc.isVerified = true;
  await otpDoc.save();
  
  return { success: true, otpDoc };
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
