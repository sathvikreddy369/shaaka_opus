import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartAPI } from '@/lib/api';

export interface CartItem {
  product: {
    _id: string;
    name: string;
    slug: string;
    price: number;
    discountPrice?: number;
    images: { url: string; publicId: string }[];
    stock: number;
    unit: string;
  };
  quantity: number;
  price: number;
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

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
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
          const cart = response.data.cart;
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

      addItem: async (productId, quantity = 1) => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.addItem(productId, quantity);
          const cart = response.data.cart;
          set({
            cart,
            itemCount: cart.items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0),
          });
        } finally {
          set({ isLoading: false });
        }
      },

      updateItem: async (productId, quantity) => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.updateItem(productId, quantity);
          const cart = response.data.cart;
          set({
            cart,
            itemCount: cart.items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0),
          });
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (productId) => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.removeItem(productId);
          const cart = response.data.cart;
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
          set({ cart: response.data.cart });
        } finally {
          set({ isLoading: false });
        }
      },

      removeCoupon: async () => {
        set({ isLoading: true });
        try {
          const response = await cartAPI.removeCoupon();
          set({ cart: response.data.cart });
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
