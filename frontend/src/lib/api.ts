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

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const { accessToken: newToken } = response.data;
        setAccessToken(newToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendOTP: (phone: string) =>
    api.post('/auth/send-otp', { phone }),

  verifyOTP: (phone: string, otp: string) =>
    api.post<{ accessToken: string; user: any }>('/auth/verify-otp', { phone, otp }),

  completeProfile: (data: { name: string; email?: string }) =>
    api.post('/auth/complete-profile', data),

  getProfile: () =>
    api.get('/auth/profile'),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.put('/auth/profile', data),

  setLocation: (lat: number, lng: number) =>
    api.post('/auth/location', { lat, lng }),

  logout: () =>
    api.post('/auth/logout'),

  refreshToken: () =>
    api.post('/auth/refresh-token'),

  // Address management
  addAddress: (data: {
    type: string;
    name: string;
    phone: string;
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault?: boolean;
  }) =>
    api.post('/auth/addresses', data),

  updateAddress: (id: string, data: {
    type?: string;
    name?: string;
    phone?: string;
    address?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    isDefault?: boolean;
  }) =>
    api.put(`/auth/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    api.delete(`/auth/addresses/${id}`),

  setDefaultAddress: (id: string) =>
    api.patch(`/auth/addresses/${id}/default`),
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

  addItem: (productId: string, quantity: number = 1) =>
    api.post('/cart/items', { productId, quantity }),

  updateItem: (productId: string, quantity: number) =>
    api.put(`/cart/items/${productId}`, { quantity }),

  removeItem: (productId: string) =>
    api.delete(`/cart/items/${productId}`),

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
    api.post('/wishlist', { productId }),

  remove: (productId: string) =>
    api.delete(`/wishlist/${productId}`),

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
    shippingAddress: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      pincode: string;
      landmark?: string;
    };
    paymentMethod: 'ONLINE' | 'COD';
    notes?: string;
  }) =>
    api.post('/orders', data),

  verifyPayment: (orderId: string, paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) =>
    api.post(`/orders/${orderId}/verify-payment`, paymentData),

  cancel: (id: string, reason?: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),

  // Admin
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),

  getAllAdmin: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get('/orders/admin/all', { params }),
};

// Review API
export const reviewAPI = {
  getByProduct: (productId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/reviews/product/${productId}`, { params }),

  create: (data: { productId: string; rating: number; comment?: string }) =>
    api.post('/reviews', data),

  update: (id: string, data: { rating?: number; comment?: string }) =>
    api.put(`/reviews/${id}`, data),

  delete: (id: string) =>
    api.delete(`/reviews/${id}`),

  getUserReviews: () =>
    api.get('/reviews/user'),
};

// Admin API
export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),

  getAnalytics: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    api.get('/admin/analytics', { params }),

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

  // Product management
  createProduct: (data: FormData) =>
    api.post('/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateProduct: (id: string, data: FormData) =>
    api.put(`/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteProduct: (id: string) =>
    api.delete(`/products/${id}`),

  // Category management
  createCategory: (data: FormData) =>
    api.post('/categories', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateCategory: (id: string, data: FormData) =>
    api.put(`/categories/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteCategory: (id: string) =>
    api.delete(`/categories/${id}`),
};

export default api;
