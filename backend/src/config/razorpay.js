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
      payment_capture: 1, // Auto-capture payments
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
  try {
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
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

const fetchOrder = async (orderId) => {
  try {
    const order = await razorpay.orders.fetch(orderId);
    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

const fetchOrderPayments = async (orderId) => {
  try {
    const payments = await razorpay.orders.fetchPayments(orderId);
    return payments;
  } catch (error) {
    console.error('Error fetching order payments:', error);
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

const fetchRefund = async (paymentId, refundId) => {
  try {
    const refund = await razorpay.refunds.fetch(refundId);
    return refund;
  } catch (error) {
    console.error('Error fetching refund:', error);
    throw error;
  }
};

// Extract detailed payment info from Razorpay payment object
const extractPaymentDetails = (payment) => {
  const details = {
    razorpayPaymentId: payment.id,
    method: payment.method || 'unknown',
    amount: payment.amount / 100, // Convert paise to rupees
    currency: payment.currency,
    fee: payment.fee, // in paise
    tax: payment.tax, // in paise
    email: payment.email,
    contact: payment.contact,
    international: payment.international || false,
  };

  // UPI specific
  if (payment.method === 'upi') {
    details.upiVpa = payment.vpa;
    if (payment.acquirer_data) {
      details.acquirerData = {
        rrn: payment.acquirer_data.rrn,
        upiTransactionId: payment.acquirer_data.upi_transaction_id,
      };
    }
  }

  // Card specific
  if (payment.method === 'card' && payment.card) {
    details.cardLast4 = payment.card.last4;
    details.cardNetwork = payment.card.network;
    details.cardType = payment.card.type;
    details.cardIssuer = payment.card.issuer;
  }

  // Netbanking specific
  if (payment.method === 'netbanking') {
    details.bankName = payment.bank;
  }

  // Wallet specific
  if (payment.method === 'wallet') {
    details.walletName = payment.wallet;
  }

  // Acquirer data for cards/netbanking
  if (payment.acquirer_data && payment.method !== 'upi') {
    details.acquirerData = {
      rrn: payment.acquirer_data.rrn,
      authCode: payment.acquirer_data.auth_code,
    };
  }

  // Error info for failed payments
  if (payment.error_code) {
    details.errorCode = payment.error_code;
    details.errorDescription = payment.error_description;
    details.errorSource = payment.error_source;
    details.errorStep = payment.error_step;
    details.errorReason = payment.error_reason;
    details.failedAt = new Date();
  }

  // Captured time
  if (payment.status === 'captured') {
    details.capturedAt = new Date(payment.created_at * 1000);
  }

  return details;
};

module.exports = {
  razorpay,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  fetchOrder,
  fetchOrderPayments,
  initiateRefund,
  fetchRefund,
  extractPaymentDetails,
};
