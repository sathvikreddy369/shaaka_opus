import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token management
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

export const getAccessToken = (): string | null => {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
};

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get refresh token from localStorage
        const refreshToken = typeof window !== 'undefined' 
          ? localStorage.getItem('refreshToken') 
          : null;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token - send refreshToken in body as backend expects
        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );

        const responseData = response.data.data || response.data;
        const { tokens } = responseData;
        
        if (!tokens?.accessToken || !tokens?.refreshToken) {
          throw new Error('Invalid token response');
        }

        setAccessToken(tokens.accessToken);
        // Update refresh token in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('refreshToken', tokens.refreshToken);
        }

        processQueue(null, tokens.accessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed, clear tokens
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Clear persisted auth state
          localStorage.removeItem('auth-storage');
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendOTP: (phone: string) =>
    api.post('/auth/request-otp', { phone }),

  verifyOTP: (phone: string, otp: string, name?: string) =>
    api.post<{ data: { user: any; tokens: { accessToken: string; refreshToken: string } } }>('/auth/verify-otp', { phone, otp, name }),

  completeProfile: (data: { name: string; email?: string }) =>
    api.put('/auth/profile', data),

  getProfile: () =>
    api.get('/auth/me'),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.put('/auth/profile', data),

  setLocation: (lat: number, lng: number) =>
    api.post('/auth/location', { lat, lng }),

  logout: () => {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refreshToken') 
      : null;
    return api.post('/auth/logout', { refreshToken });
  },

  refreshToken: () =>
    api.post('/auth/refresh-token'),

  // Address management
  addAddress: (data: {
    label: 'Home' | 'Office' | 'Other';
    houseNumber: string;
    street: string;
    colony: string;
    landmark?: string;
    latitude: number;
    longitude: number;
    isDefault?: boolean;
  }) =>
    api.post('/auth/addresses', data),

  updateAddress: (id: string, data: {
    label?: 'Home' | 'Office' | 'Other';
    houseNumber?: string;
    street?: string;
    colony?: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
  }) =>
    api.put(`/auth/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    api.delete(`/auth/addresses/${id}`),

  getAddresses: () =>
    api.get('/auth/addresses'),

  setDefaultAddress: (id: string) =>
    api.put(`/auth/addresses/${id}/default`),
};

// Category API
export const categoryAPI = {
  getAll: () =>
    api.get('/categories'),

  getBySlug: (slug: string) =>
    api.get(`/categories/${slug}`),

  create: (data: FormData) =>
    api.post('/categories', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: FormData) =>
    api.put(`/categories/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    api.delete(`/categories/${id}`),
};

// Product API
export const productAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }) =>
    api.get('/products', { params }),

  getBySlug: (slug: string) =>
    api.get(`/products/${slug}`),

  getById: (id: string) =>
    api.get(`/products/id/${id}`),

  getFeatured: () =>
    api.get('/products/featured'),

  create: (data: FormData) =>
    api.post('/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: FormData) =>
    api.put(`/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    api.delete(`/products/${id}`),

  updateStock: (id: string, quantity: number) =>
    api.patch(`/products/${id}/stock`, { quantity }),
};

// Cart API
export const cartAPI = {
  get: () =>
    api.get('/cart'),

  addItem: (productId: string, quantityOptionId: string, quantity: number = 1) =>
    api.post('/cart/items', { productId, quantityOptionId, quantity }),

  updateItem: (itemId: string, quantity: number) =>
    api.put(`/cart/items/${itemId}`, { quantity }),

  removeItem: (itemId: string) =>
    api.delete(`/cart/items/${itemId}`),

  clear: () =>
    api.delete('/cart'),

  applyCoupon: (code: string) =>
    api.post('/cart/coupon', { code }),

  removeCoupon: () =>
    api.delete('/cart/coupon'),
};

// Wishlist API
export const wishlistAPI = {
  get: () =>
    api.get('/wishlist'),

  add: (productId: string) =>
    api.post('/wishlist/items', { productId }),

  remove: (productId: string) =>
    api.delete(`/wishlist/items/${productId}`),

  check: (productId: string) =>
    api.get(`/wishlist/check/${productId}`),
};

// Order API
export const orderAPI = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/orders', { params }),

  getById: (id: string) =>
    api.get(`/orders/${id}`),

  create: (data: {
    addressId: string;
    paymentMethod: 'RAZORPAY' | 'COD';
    orderNotes?: string;
  }) =>
    api.post('/orders', data),

  verifyPayment: (orderId: string, paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) =>
    api.post(`/orders/${orderId}/verify-payment`, paymentData),

  checkPaymentStatus: (orderId: string) =>
    api.get(`/orders/${orderId}/payment-status`),

  retryPayment: (orderId: string) =>
    api.post(`/orders/${orderId}/retry-payment`),

  cancel: (id: string, reason?: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),

  // Admin
  updateStatus: (id: string, status: string, note?: string) =>
    api.put(`/admin/orders/${id}/status`, { status, note }),

  getAllAdmin: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get('/admin/orders', { params }),

  getAdminById: (id: string) =>
    api.get(`/admin/orders/${id}`),
};

// Review API
export const reviewAPI = {
  getByProduct: (productId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/products/${productId}/reviews`, { params }),

  create: (data: { productId: string; orderId: string; orderItemId: string; rating: number; comment?: string }) =>
    api.post(`/products/${data.productId}/reviews`, data),

  update: (id: string, data: { rating?: number; comment?: string }) =>
    api.put(`/reviews/${id}`, data),

  delete: (id: string) =>
    api.delete(`/reviews/${id}`),

  getUserReviews: () =>
    api.get('/reviews/user'),
};

// Admin API
export const adminAPI = {
  getDashboard: (params?: { period?: string }) =>
    api.get('/admin/dashboard', { params }),

  getAnalytics: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    api.get('/admin/analytics/revenue', { params }),

  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/admin/users', { params }),

  getUserById: (id: string) =>
    api.get(`/admin/users/${id}`),

  updateUserRole: (id: string, role: 'USER' | 'ADMIN') =>
    api.patch(`/admin/users/${id}/role`, { role }),

  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
  }) =>
    api.get('/admin/audit-logs', { params }),

  // Product management (admin routes)
  createProduct: (data: FormData) =>
    api.post('/admin/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateProduct: (id: string, data: FormData) =>
    api.put(`/admin/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteProduct: (id: string) =>
    api.delete(`/admin/products/${id}`),

  // Category management (admin routes)
  createCategory: (data: FormData) =>
    api.post('/admin/categories', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateCategory: (id: string, data: FormData) =>
    api.put(`/admin/categories/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteCategory: (id: string) =>
    api.delete(`/admin/categories/${id}`),
};

export default api;
