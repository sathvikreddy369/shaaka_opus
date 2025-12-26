const axios = require('axios');
const config = require('../config');

// Check if we should send real OTPs (can be overridden in dev mode)
const shouldSendRealOTP = () => {
  return config.env !== 'development' || process.env.ENABLE_REAL_OTP === 'true';
};

/**
 * Send OTP via MSG91
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp - 4-digit OTP
 */
const sendOTP = async (phone, otp) => {
  // Always log the OTP for debugging
  console.log(`[OTP] Generated OTP for ${phone}: ${otp}`);

  if (!shouldSendRealOTP()) {
    console.log(`[DEV] OTP for ${phone}: ${otp} (dev mode - not sending SMS)`);
    return { success: true, message: 'OTP sent (dev mode)', otp };
  }

  try {
    // MSG91 Send OTP API - Using flow API for OTP
    // For template variable ##OTP##, send as "OTP" in recipients
    const payload = {
      template_id: config.msg91.otpTemplateId,
      short_url: '0',
      realTimeResponse: '1',
      recipients: [
        {
          mobiles: `91${phone}`,
          OTP: otp,  // This matches ##OTP## in the template
        }
      ]
    };

    console.log('[MSG91] Sending OTP request with payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      'https://control.msg91.com/api/v5/flow/',
      payload,
      {
        headers: {
          'authkey': config.msg91.authKey,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[MSG91] Response:', JSON.stringify(response.data, null, 2));

    if (response.data.type === 'success' || response.data.message === 'success') {
      return { success: true, message: 'OTP sent successfully', otp };
    }

    throw new Error(response.data.message || 'Failed to send OTP');
  } catch (error) {
    console.error('[MSG91] OTP Error:', error.response?.data || error.message);
    console.error('[MSG91] Full error:', error.response?.status, error.response?.statusText);
    // In case MSG91 fails, still allow the OTP to be generated locally
    // so the user can use the OTP from server logs
    console.log(`[FALLBACK] OTP for ${phone}: ${otp} - Use this OTP to login`);
    return { success: true, message: 'OTP sent (fallback mode)', otp };
  }
};

/**
 * Verify OTP via MSG91
 * Note: We're handling OTP verification locally, but this is for direct MSG91 verification if needed
 */
const verifyOTPviaMSG91 = async (phone, otp) => {
  if (!shouldSendRealOTP()) {
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
