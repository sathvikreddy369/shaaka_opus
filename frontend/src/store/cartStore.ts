import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartAPI } from '@/lib/api';

export interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    images: { url: string; publicId: string }[];
  };
  quantityOption: {
    _id: string;
    quantity: string;
    price: number;
    sellingPrice: number;
    stock: number;
  };
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  coupon?: {
    code: string;
    discount: number;
  };
}

// Calculate cart totals since backend only returns subtotal
function calculateCartTotals(cart: any): Cart {
  const subtotal = cart.subtotal || cart.items?.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0) || 0;
  const discount = cart.discount || 0;
  const deliveryCharge = subtotal >= 500 ? 0 : 40; // Free delivery above ₹500
  const total = subtotal - discount + deliveryCharge;
  
  return {
    ...cart,
    subtotal,
    discount,
    deliveryCharge,
    total,
  };
}

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantityOptionId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      itemCount: 0,

      fetchCart: async () => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.get();
          const cartData = response.data.data || response.data;
          const rawCart = cartData.cart;
          const cart = rawCart ? calculateCartTotals(rawCart) : null;
          set({
            cart,
            itemCount: cart?.items?.reduce((acc: number, item: CartItem) => acc + item.quantity, 0) || 0,
          });
        } catch (error) {
          set({ cart: null, itemCount: 0 });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (productId, quantityOptionId, quantity = 1) => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.addItem(productId, quantityOptionId, quantity);
          const cartData = response.data.data || response.data;
          const rawCart = cartData.cart;
          const cart = calculateCartTotals(rawCart);
          set({
            cart,
            itemCount: cart.items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0),
          });
        } finally {
          set({ isLoading: false });
        }
      },

      updateItem: async (itemId, quantity) => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.updateItem(itemId, quantity);
          const cartData = response.data.data || response.data;
          const rawCart = cartData.cart;
          const cart = calculateCartTotals(rawCart);
          set({
            cart,
            itemCount: cart.items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0),
          });
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (itemId) => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.removeItem(itemId);
          const cartData = response.data.data || response.data;
          const rawCart = cartData.cart;
          const cart = rawCart ? calculateCartTotals(rawCart) : null;
          set({
            cart,
            itemCount: cart?.items?.reduce((acc: number, item: CartItem) => acc + item.quantity, 0) || 0,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: async () => {
        set({ isLoading: true });
        try {
          await cartAPI.clear();
          set({ cart: null, itemCount: 0 });
        } finally {
          set({ isLoading: false });
        }
      },

      applyCoupon: async (code) => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.applyCoupon(code);
          const cartData = response.data.data || response.data;
          set({ cart: cartData.cart });
        } finally {
          set({ isLoading: false });
        }
      },

      removeCoupon: async () => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.removeCoupon();
          const cartData = response.data.data || response.data;
          set({ cart: cartData.cart });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        itemCount: state.itemCount,
      }),
    }
  )
);
