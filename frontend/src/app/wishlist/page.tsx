'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { HeartIcon } from '@heroicons/react/24/outline';
import { useAuthStore, useWishlistStore, useUIStore } from '@/store';
import ProductGrid from '@/components/products/ProductGrid';

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const { items, isLoading, fetchWishlist } = useWishlistStore();
  const { openAuthModal } = useUIStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <HeartIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Please login to view your wishlist</h1>
        <button onClick={openAuthModal} className="btn-primary">
          Login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold mb-8">My Wishlist</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-0 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <HeartIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Your wishlist is empty</h1>
        <p className="text-gray-500 mb-6">
          Save products you like by clicking the heart icon
        </p>
        <Link href="/products" className="btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold">My Wishlist</h1>
          <p className="text-gray-500">{items.length} items saved</p>
        </div>
        <Link href="/products" className="btn-secondary">
          Continue Shopping
        </Link>
      </div>

      <ProductGrid products={items} />
    </div>
  );
}
