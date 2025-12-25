const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('./index');

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

const createOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt,
      notes,
    };
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body.toString())
    .digest('hex');
  return expectedSignature === signature;
};

const verifyWebhookSignature = (body, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(JSON.stringify(body))
    .digest('hex');
  return expectedSignature === signature;
};

const fetchPayment = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw error;
  }
};

const initiateRefund = async (paymentId, amount, notes = {}) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      notes,
    });
    return refund;
  } catch (error) {
    console.error('Error initiating refund:', error);
    throw error;
  }
};

module.exports = {
  razorpay,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  initiateRefund,
};
