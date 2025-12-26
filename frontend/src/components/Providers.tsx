'use client';

import { useEffect } from 'react';
import { useAuthStore, useCartStore, useWishlistStore } from '@/store';
import { prefetchCommonData } from '@/lib/cachedApi';
import AuthModal from './modals/AuthModal';
import LocationModal from './modals/LocationModal';
import SearchModal from './modals/SearchModal';
import CartSidebar from './cart/CartSidebar';
import Toast from './ui/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  const { initializeAuth, isAuthenticated, isInitialized } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchWishlist } = useWishlistStore();

  useEffect(() => {
    // Initialize auth on app load
    initializeAuth();
    
    // Prefetch common data in background
    prefetchCommonData();
  }, [initializeAuth]);

  useEffect(() => {
    // Fetch cart and wishlist when authenticated and initialized
    if (isAuthenticated && isInitialized) {
      fetchCart();
      fetchWishlist();
    }
  }, [isAuthenticated, isInitialized, fetchCart, fetchWishlist]);

  return (
    <>
      {children}
      <AuthModal />
      <LocationModal />
      <SearchModal />
      <CartSidebar />
      <Toast />
    </>
  );
}
