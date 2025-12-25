import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { wishlistAPI } from '@/lib/api';

export interface WishlistItem {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  images: { url: string; publicId: string }[];
  stock: number;
  unit: string;
}

interface WishlistState {
  items: WishlistItem[];
  itemIds: Set<string>;
  isLoading: boolean;

  // Actions
  fetchWishlist: () => Promise<void>;
  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  toggleItem: (productId: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      itemIds: new Set(),
      isLoading: false,

      fetchWishlist: async () => {
        set({ isLoading: true });
        try {
          const response = await wishlistAPI.get();
          const items = response.data.wishlist?.products || [];
          set({
            items,
            itemIds: new Set(items.map((item: WishlistItem) => item._id)),
          });
        } catch (error) {
          set({ items: [], itemIds: new Set() });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (productId) => {
        set({ isLoading: true });
        try {
          const response = await wishlistAPI.add(productId);
          const items = response.data.wishlist.products;
          set({
            items,
            itemIds: new Set(items.map((item: WishlistItem) => item._id)),
          });
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (productId) => {
        set({ isLoading: true });
        try {
          const response = await wishlistAPI.remove(productId);
          const items = response.data.wishlist?.products || [];
          set({
            items,
            itemIds: new Set(items.map((item: WishlistItem) => item._id)),
          });
        } finally {
          set({ isLoading: false });
        }
      },

      isInWishlist: (productId) => {
        return get().itemIds.has(productId);
      },

      toggleItem: async (productId) => {
        const { isInWishlist, addItem, removeItem } = get();
        if (isInWishlist(productId)) {
          await removeItem(productId);
        } else {
          await addItem(productId);
        }
      },
    }),
    {
      name: 'wishlist-storage',
      partialize: (state) => ({
        itemIds: Array.from(state.itemIds),
      }),
      merge: (persisted: any, current) => ({
        ...current,
        itemIds: new Set(persisted?.itemIds || []),
      }),
    }
  )
);
