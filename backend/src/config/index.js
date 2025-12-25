require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shaaka',
  },
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  msg91: {
    authKey: process.env.MSG91_AUTH_KEY,
    senderId: process.env.MSG91_SENDER_ID || 'SHAAKA',
    templateId: process.env.MSG91_TEMPLATE_ID,
    otpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID,
  },
  
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    deliveryRadiusKm: parseFloat(process.env.DELIVERY_RADIUS_KM) || 25,
    minOrderValue: parseFloat(process.env.MIN_ORDER_VALUE) || 200,
    freeDeliveryThreshold: parseFloat(process.env.FREE_DELIVERY_THRESHOLD) || 500,
    deliveryCharge: parseFloat(process.env.DELIVERY_CHARGE) || 40,
    codEnabled: process.env.COD_ENABLED === 'true',
  },
  
  hyderabad: {
    lat: parseFloat(process.env.HYDERABAD_LAT) || 17.385044,
    lng: parseFloat(process.env.HYDERABAD_LNG) || 78.486671,
  },
  
  rateLimit: {
    otpWindowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS, 10) || 900000,
    otpMax: parseInt(process.env.OTP_RATE_LIMIT_MAX, 10) || 5,
  },
};

module.exports = config;
