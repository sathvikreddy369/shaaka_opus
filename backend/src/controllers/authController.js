const { User, OTP } = require('../models');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { sendOTP } = require('../utils/msg91');
const { asyncHandler, sendResponse } = require('../utils/helpers');
const { AuthenticationError, NotFoundError, ValidationError } = require('../utils/errors');

// Test phone numbers that bypass OTP verification (for development/testing)
const TEST_PHONE_NUMBERS = [
  '9999999999',
  '9999999998',
  '9999999997',
  '9876543210',
  '9876543211',
];
const TEST_OTP = '1234';

/**
 * @desc    Request OTP for login/signup
 * @route   POST /api/auth/request-otp
 * @access  Public
 */
const requestOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ phone });

  // For test numbers, skip actual OTP sending
  if (TEST_PHONE_NUMBERS.includes(phone)) {
    console.log(`[TEST MODE] OTP for ${phone}: ${TEST_OTP}`);
    sendResponse(res, 200, {
      data: {
        isNewUser: !existingUser,
        isProfileComplete: existingUser?.isProfileComplete || false,
        testMode: true,
      },
    }, 'OTP sent successfully (Test Mode - Use 1234)');
    return;
  }

  // Generate and save OTP
  const otpDoc = await OTP.createOTP(phone);

  // Send OTP via MSG91
  await sendOTP(phone, otpDoc.otp);

  sendResponse(res, 200, {
    data: {
      isNewUser: !existingUser,
      isProfileComplete: existingUser?.isProfileComplete || false,
    },
  }, 'OTP sent successfully');
});

/**
 * @desc    Verify OTP and login/signup
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOTPAndLogin = asyncHandler(async (req, res) => {
  const { phone, otp, name, email } = req.body;

  // Check if test number with test OTP
  const isTestLogin = TEST_PHONE_NUMBERS.includes(phone) && otp === TEST_OTP;

  if (!isTestLogin) {
    // Verify OTP for non-test numbers
    const result = await OTP.verifyOTP(phone, otp);
    if (!result.success) {
      throw new ValidationError(result.message);
    }
    // Delete used OTP
    await OTP.deleteOne({ _id: result.otpDoc._id });
  }

  // Find or create user
  let user = await User.findOne({ phone });
  let isNewUser = false;

  if (!user) {
    // New user - name is required
    if (!name) {
      throw new ValidationError('Name is required for new users');
    }

    user = await User.create({
      phone,
      name,
      email,
      isProfileComplete: !!name,
    });
    isNewUser = true;
  } else if (name && !user.name) {
    // Existing user completing profile
    user.name = name;
    if (email) user.email = email;
    user.isProfileComplete = true;
    await user.save();
  }

  // Update last login
  user.lastLogin = new Date();
  
  // Generate tokens
  const tokens = generateTokenPair(user);
  
  // Save refresh token
  await user.addRefreshToken(tokens.refreshToken);

  sendResponse(res, 200, {
    data: {
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
      },
      tokens,
      isNewUser,
    },
  }, 'Login successful');
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new AuthenticationError('Refresh token required');
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Find user and check if token exists
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  if (!user.hasRefreshToken(token)) {
    throw new AuthenticationError('Refresh token not found');
  }

  // Generate new token pair
  const tokens = generateTokenPair(user);

  // Remove old refresh token and add new one
  await user.removeRefreshToken(token);
  await user.addRefreshToken(tokens.refreshToken);

  sendResponse(res, 200, {
    data: { tokens },
  }, 'Token refreshed');
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  
  sendResponse(res, 200, {
    data: { user },
  });
});

/**
 * @desc    Update profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  if (name) user.name = name;
  if (email !== undefined) user.email = email;
  
  if (name && !user.isProfileComplete) {
    user.isProfileComplete = true;
  }

  await user.save();

  sendResponse(res, 200, {
    data: { user },
  }, 'Profile updated');
});

/**
 * @desc    Logout (invalidate refresh token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (token) {
    await req.user.removeRefreshToken(token);
  }

  sendResponse(res, 200, {}, 'Logged out successfully');
});

/**
 * @desc    Logout from all devices
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAll = asyncHandler(async (req, res) => {
  await req.user.removeAllRefreshTokens();

  sendResponse(res, 200, {}, 'Logged out from all devices');
});

// Address management
/**
 * @desc    Get all addresses
 * @route   GET /api/auth/addresses
 * @access  Private
 */
const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  
  sendResponse(res, 200, {
    data: { addresses: user.addresses },
  });
});

/**
 * @desc    Add new address
 * @route   POST /api/auth/addresses
 * @access  Private
 */
const addAddress = asyncHandler(async (req, res) => {
  const { label, houseNumber, street, colony, landmark, latitude, longitude, isDefault } = req.body;

  const user = await User.findById(req.userId);

  // If this is the first address or isDefault is true, set as default
  if (user.addresses.length === 0 || isDefault) {
    user.addresses.forEach(addr => addr.isDefault = false);
  }

  user.addresses.push({
    label,
    houseNumber,
    street,
    colony,
    landmark,
    latitude,
    longitude,
    isDefault: user.addresses.length === 0 || isDefault,
  });

  await user.save();

  sendResponse(res, 201, {
    data: { addresses: user.addresses },
  }, 'Address added');
});

/**
 * @desc    Update address
 * @route   PUT /api/auth/addresses/:addressId
 * @access  Private
 */
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const updates = req.body;

  const user = await User.findById(req.userId);
  const address = user.addresses.id(addressId);

  if (!address) {
    throw new NotFoundError('Address');
  }

  Object.keys(updates).forEach(key => {
    if (key !== '_id' && key !== 'isDefault') {
      address[key] = updates[key];
    }
  });

  await user.save();

  sendResponse(res, 200, {
    data: { addresses: user.addresses },
  }, 'Address updated');
});

/**
 * @desc    Delete address
 * @route   DELETE /api/auth/addresses/:addressId
 * @access  Private
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.userId);
  const address = user.addresses.id(addressId);

  if (!address) {
    throw new NotFoundError('Address');
  }

  const wasDefault = address.isDefault;
  user.addresses.pull(addressId);

  // Set first address as default if deleted address was default
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();

  sendResponse(res, 200, {
    data: { addresses: user.addresses },
  }, 'Address deleted');
});

/**
 * @desc    Set default address
 * @route   PUT /api/auth/addresses/:addressId/default
 * @access  Private
 */
const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.userId);
  await user.setDefaultAddress(addressId);

  sendResponse(res, 200, {
    data: { addresses: user.addresses },
  }, 'Default address set');
});

module.exports = {
  requestOTP,
  verifyOTPAndLogin,
  refreshToken,
  getMe,
  updateProfile,
  logout,
  logoutAll,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
