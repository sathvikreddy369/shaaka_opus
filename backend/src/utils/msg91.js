const axios = require('axios');
const config = require('../config');

/**
 * Send OTP via MSG91
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp - 6-digit OTP
 */
const sendOTP = async (phone, otp) => {
  if (config.env === 'development') {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return { success: true, message: 'OTP sent (dev mode)' };
  }

  try {
    const response = await axios.post(
      'https://api.msg91.com/api/v5/otp',
      {
        template_id: config.msg91.otpTemplateId,
        mobile: `91${phone}`,
        otp: otp,
      },
      {
        headers: {
          'authkey': config.msg91.authKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.type === 'success') {
      return { success: true, message: 'OTP sent successfully' };
    }

    throw new Error(response.data.message || 'Failed to send OTP');
  } catch (error) {
    console.error('MSG91 OTP Error:', error.response?.data || error.message);
    throw new Error('Failed to send OTP. Please try again.');
  }
};

/**
 * Verify OTP via MSG91
 * Note: We're handling OTP verification locally, but this is for direct MSG91 verification if needed
 */
const verifyOTPviaMSG91 = async (phone, otp) => {
  if (config.env === 'development') {
    return { success: true, message: 'OTP verified (dev mode)' };
  }

  try {
    const response = await axios.get(
      `https://api.msg91.com/api/v5/otp/verify?mobile=91${phone}&otp=${otp}`,
      {
        headers: {
          'authkey': config.msg91.authKey,
        },
      }
    );

    if (response.data.type === 'success') {
      return { success: true, message: 'OTP verified successfully' };
    }

    return { success: false, message: response.data.message || 'Invalid OTP' };
  } catch (error) {
    console.error('MSG91 Verify Error:', error.response?.data || error.message);
    return { success: false, message: 'Verification failed' };
  }
};

/**
 * Send SMS notification
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} message - Message content
 * @param {string} templateId - MSG91 template ID
 */
const sendSMS = async (phone, templateId, variables = {}) => {
  if (config.env === 'development') {
    console.log(`[DEV] SMS to ${phone}:`, variables);
    return { success: true, message: 'SMS sent (dev mode)' };
  }

  try {
    const response = await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      {
        template_id: templateId,
        recipients: [
          {
            mobiles: `91${phone}`,
            ...variables,
          },
        ],
      },
      {
        headers: {
          'authkey': config.msg91.authKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.type === 'success') {
      return { success: true, message: 'SMS sent successfully' };
    }

    throw new Error(response.data.message || 'Failed to send SMS');
  } catch (error) {
    console.error('MSG91 SMS Error:', error.response?.data || error.message);
    // Don't throw error for SMS, just log it
    return { success: false, message: 'Failed to send SMS' };
  }
};

/**
 * Send order confirmation SMS
 */
const sendOrderConfirmationSMS = async (phone, orderNumber, total) => {
  return sendSMS(phone, config.msg91.templateId, {
    order_number: orderNumber,
    total: `₹${total}`,
  });
};

/**
 * Send order status update SMS
 */
const sendOrderStatusSMS = async (phone, orderNumber, status) => {
  const statusMessages = {
    PACKED: 'Your order has been packed and will be shipped soon.',
    READY_TO_DELIVER: 'Your order is ready for delivery.',
    HANDED_TO_AGENT: 'Your order is out for delivery.',
    DELIVERED: 'Your order has been delivered. Thank you for shopping with Shaaka!',
    CANCELLED: 'Your order has been cancelled.',
    REFUND_INITIATED: 'Refund has been initiated for your order.',
  };

  return sendSMS(phone, config.msg91.templateId, {
    order_number: orderNumber,
    message: statusMessages[status] || `Order status: ${status}`,
  });
};

module.exports = {
  sendOTP,
  verifyOTPviaMSG91,
  sendSMS,
  sendOrderConfirmationSMS,
  sendOrderStatusSMS,
};
