'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserIcon,
  ShoppingBagIcon,
  HeartIcon,
  MapPinIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore, useUIStore } from '@/store';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, fetchProfile } = useAuthStore();
  const { openAuthModal, addToast } = useUIStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    fetchProfile().finally(() => setIsLoading(false));
  }, [isAuthenticated, fetchProfile, openAuthModal]);

  const handleLogout = async () => {
    await logout();
    addToast({ type: 'success', message: 'Logged out successfully' });
    router.push('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <UserIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Please login to view your account</h1>
        <button onClick={openAuthModal} className="btn-primary">
          Login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="card p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      icon: ShoppingBagIcon,
      title: 'My Orders',
      description: 'View and track your orders',
      href: '/account/orders',
    },
    {
      icon: HeartIcon,
      title: 'Wishlist',
      description: 'Products you saved for later',
      href: '/wishlist',
    },
    {
      icon: MapPinIcon,
      title: 'Addresses',
      description: 'Manage delivery addresses',
      href: '/account/addresses',
    },
    {
      icon: UserIcon,
      title: 'Profile Settings',
      description: 'Update your personal information',
      href: '/account/profile',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-heading font-bold mb-8">My Account</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* User info */}
        <div className="md:col-span-1">
          <div className="card p-6 text-center">
            <div className="w-20 h-20 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <UserIcon className="h-10 w-10 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold">{user?.name || 'User'}</h2>
            <p className="text-gray-500">+91 {user?.phone}</p>
            {user?.email && <p className="text-gray-500">{user.email}</p>}

            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="btn-secondary mt-4 w-full text-center block"
              >
                Admin Dashboard
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 font-medium"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Menu items */}
        <div className="md:col-span-2">
          <div className="space-y-4">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
