/**
 * User Service - Centralized user business logic with caching
 */

const { User, OTP } = require('../models');
const { NotFoundError, ValidationError, AuthenticationError } = require('../utils/errors');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { sendOTP } = require('../utils/msg91');
const { cacheService } = require('./cacheService');
const { CACHE_TTL, RATE_LIMITS } = require('../constants');
const { redisClient, isRedisEnabled, prefixKey } = require('../config/redis');

// Test phone numbers for development
const TEST_PHONE_NUMBERS = [
  '9999999999',
  '9999999998',
  '9999999997',
  '9876543210',
  '9876543211',
  '7777777771',
  '7777777772',
  '7777777773',
];
const TEST_OTP = '1234';

// Cache keys
const CACHE_KEYS = {
  userById: (id) => `user:id:${id}`,
  userByPhone: (phone) => `user:phone:${phone}`,
  userProfile: (id) => `user:profile:${id}`,
  userAddresses: (id) => `user:addresses:${id}`,
};

class UserService {
  /**
   * Enforce OTP rate limit using Redis when available
   */
  async enforceOtpRateLimit(phone) {
    if (!isRedisEnabled() || !redisClient) return;

    const key = prefixKey(`otp:${phone}`);
    const ttlSeconds = Math.floor(RATE_LIMITS.OTP.WINDOW_MS / 1000);

    try {
      const attempts = await redisClient.incr(key);
      if (attempts === 1) {
        await redisClient.expire(key, ttlSeconds);
      }

      if (attempts > RATE_LIMITS.OTP.MAX_REQUESTS) {
        throw new ValidationError('Too many OTP requests. Please try again later.');
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      console.error('[OTP] Redis rate limit check failed', err.message);
    }
  }

  /**
   * Check if phone is a test number
   * @param {string} phone - Phone number
   * @returns {boolean} Is test number
   */
  isTestPhone(phone) {
    return TEST_PHONE_NUMBERS.includes(phone);
  }

  /**
   * Get user by ID with caching
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User document
   */
  async getUserById(userId) {
    return cacheService.getOrSet(CACHE_KEYS.userById(userId), async () => {
      const user = await User.findById(userId)
        .select('-__v')
        .lean();
      
      if (!user) {
        throw new NotFoundError('User');
      }
      
      return user;
    }, CACHE_TTL.USER_PROFILE);
  }

  /**
   * Get user by phone
   * @param {string} phone - Phone number
   * @returns {Promise<Object|null>} User document or null
   */
  async getUserByPhone(phone) {
    return User.findOne({ phone }).lean();
  }

  /**
   * Request OTP for login/signup
   * @param {string} phone - Phone number
   * @returns {Promise<Object>} OTP request result
   */
  async requestOTP(phone) {
    const existingUser = await this.getUserByPhone(phone);

    // For test numbers, skip actual OTP sending
    if (this.isTestPhone(phone)) {
      console.log(`[TEST MODE] OTP for ${phone}: ${TEST_OTP}`);
      return {
        isNewUser: !existingUser,
        isProfileComplete: existingUser?.isProfileComplete || false,
        testMode: true,
      };
    }

    await this.enforceOtpRateLimit(phone);

    // Generate and save OTP
    const otpDoc = await OTP.createOTP(phone);

    // Send OTP via MSG91
    await sendOTP(phone, otpDoc.otp);

    return {
      isNewUser: !existingUser,
      isProfileComplete: existingUser?.isProfileComplete || false,
    };
  }

  /**
   * Verify OTP and perform login/signup
   * @param {Object} data - Login data
   * @returns {Promise<Object>} Login result with tokens
   */
  async verifyOTPAndLogin({ phone, otp, name, email }) {
    const isTestLogin = this.isTestPhone(phone) && otp === TEST_OTP;

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
      user.name = name;
      if (email) user.email = email;
      user.isProfileComplete = true;
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = generateTokenPair({
      userId: user._id,
      role: user.role,
    });

    // Persist refresh token for rotation/revocation
    await user.addRefreshToken(refreshToken);

    // Invalidate cache
    this.invalidateUserCache(user._id.toString());

    return {
      accessToken,
      refreshToken,
      expiresIn,
      isNewUser,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
      },
    };
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Enforce token rotation and revocation
    if (!user.hasRefreshToken(refreshToken)) {
      throw new AuthenticationError('Refresh token not recognized');
    }

    const tokens = generateTokenPair({
      userId: user._id,
      role: user.role,
    });

    // Rotate stored refresh tokens
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(tokens.refreshToken);

    return tokens;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, { name, email }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (name) user.name = name;
    if (email !== undefined) user.email = email || null;
    
    if (!user.isProfileComplete && user.name) {
      user.isProfileComplete = true;
    }

    await user.save();
    
    // Invalidate cache
    this.invalidateUserCache(userId);

    return {
      _id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
    };
  }

  /**
   * Get user addresses
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>} User addresses
   */
  async getAddresses(userId) {
    return cacheService.getOrSet(CACHE_KEYS.userAddresses(userId), async () => {
      const user = await User.findById(userId).select('addresses').lean();
      if (!user) {
        throw new NotFoundError('User');
      }
      return user.addresses || [];
    }, CACHE_TTL.USER_PROFILE);
  }

  /**
   * Add address for user
   * @param {string} userId - User ID
   * @param {Object} addressData - Address data
   * @returns {Promise<Object[]>} Updated addresses
   */
  async addAddress(userId, addressData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // If this is the first address or marked as default, set as default
    if (user.addresses.length === 0 || addressData.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
      addressData.isDefault = true;
    }

    user.addresses.push(addressData);
    await user.save();

    // Invalidate cache
    this.invalidateUserCache(userId);

    return user.addresses;
  }

  /**
   * Update user address
   * @param {string} userId - User ID
   * @param {string} addressId - Address ID
   * @param {Object} updates - Address updates
   * @returns {Promise<Object[]>} Updated addresses
   */
  async updateAddress(userId, addressId, updates) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new NotFoundError('Address');
    }

    // If setting as default, unset others
    if (updates.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, updates);
    await user.save();

    // Invalidate cache
    this.invalidateUserCache(userId);

    return user.addresses;
  }

  /**
   * Delete user address
   * @param {string} userId - User ID
   * @param {string} addressId - Address ID
   * @returns {Promise<Object[]>} Updated addresses
   */
  async deleteAddress(userId, addressId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      throw new NotFoundError('Address');
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    // If deleted address was default, set another as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    // Invalidate cache
    this.invalidateUserCache(userId);

    return user.addresses;
  }

  /**
   * Get default address
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Default address
   */
  async getDefaultAddress(userId) {
    const addresses = await this.getAddresses(userId);
    return addresses.find(addr => addr.isDefault) || addresses[0] || null;
  }

  /**
   * Validate user is active
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User if active
   */
  async validateActiveUser(userId) {
    const user = await User.findById(userId).select('isActive role').lean();
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }
    return user;
  }

  /**
   * Get users for admin with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Users with pagination
   */
  async getUsers({ page = 1, limit = 20, search, role } = {}) {
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role) {
      filter.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User stats
   */
  async getUserStats() {
    const [total, active, admins, newThisMonth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(1)) }
      }),
    ]);

    return { total, active, admins, newThisMonth };
  }

  /**
   * Invalidate all caches for a user
   * @param {string} userId - User ID
   */
  async invalidateUserCache(userId) {
    await Promise.all([
      cacheService.delete(CACHE_KEYS.userById(userId)),
      cacheService.delete(CACHE_KEYS.userProfile(userId)),
      cacheService.delete(CACHE_KEYS.userAddresses(userId)),
    ]);
  }
}

module.exports = new UserService();
