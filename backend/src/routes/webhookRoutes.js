const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Razorpay webhook (raw body needed for signature verification)
router.post('/razorpay', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Parse body if it's a buffer
  if (Buffer.isBuffer(req.body)) {
    req.body = JSON.parse(req.body.toString());
  }
  next();
}, orderController.handleRazorpayWebhook);

module.exports = router;
