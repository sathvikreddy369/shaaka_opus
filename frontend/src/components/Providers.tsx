'use client';

import { useEffect } from 'react';
import { useAuthStore, useCartStore, useWishlistStore } from '@/store';
import { getAccessToken } from '@/lib/api';
import AuthModal from './modals/AuthModal';
import LocationModal from './modals/LocationModal';
import CartSidebar from './cart/CartSidebar';
import Toast from './ui/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  const { fetchProfile, isAuthenticated } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchWishlist } = useWishlistStore();

  useEffect(() => {
    // Check if user has a token and fetch profile
    const token = getAccessToken();
    if (token) {
      fetchProfile();
    }
  }, [fetchProfile]);

  useEffect(() => {
    // Fetch cart and wishlist when authenticated
    if (isAuthenticated) {
      fetchCart();
      fetchWishlist();
    }
  }, [isAuthenticated, fetchCart, fetchWishlist]);

  return (
    <>
      {children}
      <AuthModal />
      <LocationModal />
      <CartSidebar />
      <Toast />
    </>
  );
}
