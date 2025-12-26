import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { wishlistAPI } from '@/lib/api';

interface QuantityOption {
  _id: string;
  quantity: string;
  price: number;
  sellingPrice: number;
  discountPercent: number;
  discountFlat: number;
  stock: number;
}

// The product structure as returned from wishlist API
interface WishlistProduct {
  _id: string;
  name: string;
  slug: string;
  image?: { url: string; publicId: string };
  images?: { url: string; publicId: string }[];
  quantityOptions?: QuantityOption[];
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isOutOfStock: boolean;
}

// Wishlist item as returned from API
interface WishlistAPIItem {
  _id: string;
  product: WishlistProduct;
  addedAt: string;
  priceChanged?: boolean;
}

// Transformed item for frontend use (compatible with ProductCard)
export interface WishlistItem {
  _id: string;
  name: string;
  slug: string;
  images: { url: string; publicId: string }[];
  quantityOptions: QuantityOption[];
  isOutOfStock: boolean;
  averageRating?: number;
  reviewCount?: number;
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

// Transform API item to frontend format
const transformWishlistItems = (apiItems: WishlistAPIItem[]): WishlistItem[] => {
  return apiItems.map(item => {
    const product = item.product;
    return {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      images: product.images || (product.image ? [product.image] : []),
      quantityOptions: product.quantityOptions || [],
      isOutOfStock: product.isOutOfStock || false,
    };
  }).filter(item => item._id); // Filter out invalid items
};

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
          const wishlistData = response.data.data || response.data;
          const apiItems = wishlistData.wishlist?.items || [];
          const items = transformWishlistItems(apiItems);
          set({
            items,
            itemIds: new Set(items.map((item: WishlistItem) => item._id)),
          });
        } catch (error) {
          console.error('Failed to fetch wishlist:', error);
          set({ items: [], itemIds: new Set() });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (productId) => {
        set({ isLoading: true });
        try {
          const response = await wishlistAPI.add(productId);
          const wishlistData = response.data.data || response.data;
          const apiItems = wishlistData.wishlist?.items || [];
          const items = transformWishlistItems(apiItems);
          set({
            items,
            itemIds: new Set(items.map((item: WishlistItem) => item._id)),
          });
        } catch (error) {
          console.error('Failed to add to wishlist:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (productId) => {
        set({ isLoading: true });
        try {
          const response = await wishlistAPI.remove(productId);
          const wishlistData = response.data.data || response.data;
          const apiItems = wishlistData.wishlist?.items || [];
          const items = transformWishlistItems(apiItems);
          set({
            items,
            itemIds: new Set(items.map((item: WishlistItem) => item._id)),
          });
        } catch (error) {
          console.error('Failed to remove from wishlist:', error);
          throw error;
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
