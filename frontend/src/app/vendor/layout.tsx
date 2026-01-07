'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  Squares2X2Icon,
  CubeIcon,
  ShoppingCartIcon,
  StarIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  BuildingStorefrontIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import NotificationBell from '@/components/layout/NotificationBell';

const navItems = [
  { href: '/vendor', label: 'Dashboard', icon: Squares2X2Icon },
  { href: '/vendor/orders', label: 'Orders', icon: ShoppingCartIcon },
  { href: '/vendor/products', label: 'Products', icon: CubeIcon },
  { href: '/vendor/reviews', label: 'Reviews', icon: StarIcon },
  { href: '/vendor/analytics', label: 'Analytics', icon: ChartBarIcon },
  { href: '/vendor/settings', label: 'Settings', icon: Cog6ToothIcon },
];

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isVendor, isApprovedVendor, logout, isInitialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/');
      return;
    }
    
    // If user is vendor role but no vendorProfile, redirect to register
    if (isInitialized && isAuthenticated && user?.role === 'VENDOR' && !user?.vendorProfile) {
      router.push('/vendor/register');
      return;
    }
    
    if (isInitialized && isAuthenticated && !isVendor()) {
      router.push('/');
      return;
    }
  }, [isInitialized, isAuthenticated, isVendor, router, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!isInitialized || !isAuthenticated || !isVendor() || !user?.vendorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const vendorProfile = user?.vendorProfile;
  const isPending = vendorProfile?.status === 'PENDING_APPROVAL';
  const isRejected = vendorProfile?.status === 'REJECTED';
  const isSuspended = vendorProfile?.status === 'SUSPENDED';

  // Show status banner for non-approved vendors
  const showStatusBanner = isPending || isRejected || isSuspended;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          {sidebarOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2">
          <BuildingStorefrontIcon className="text-green-600 w-6 h-6" />
          <span className="font-semibold">Vendor Dashboard</span>
        </div>
        <NotificationBell />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <BuildingStorefrontIcon className="text-green-600 w-7 h-7" />
              <span className="text-xl font-bold text-gray-800">Vendor Portal</span>
            </div>
            <NotificationBell />
          </div>

          {/* Vendor Info */}
          <div className="px-4 py-4 border-b bg-gray-50">
            <p className="font-semibold text-gray-800 truncate">
              {vendorProfile?.businessName || 'Your Business'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  vendorProfile?.status === 'APPROVED'
                    ? 'bg-green-100 text-green-700'
                    : vendorProfile?.status === 'PENDING_APPROVAL'
                    ? 'bg-yellow-100 text-yellow-700'
                    : vendorProfile?.status === 'SUSPENDED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {vendorProfile?.status?.replace('_', ' ')}
              </span>
              {vendorProfile?.flag && vendorProfile.flag !== 'NONE' && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                  {vendorProfile.flag}
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isDisabled = !isApprovedVendor() && item.href !== '/vendor' && item.href !== '/vendor/settings';

              return (
                <Link
                  key={item.href}
                  href={isDisabled ? '#' : item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : isDisabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                    } else {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {isDisabled && <ClockIcon className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-4 py-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        {/* Status Banner */}
        {showStatusBanner && (
          <div
            className={`px-4 py-3 flex items-center gap-3 ${
              isPending
                ? 'bg-yellow-50 border-b border-yellow-200'
                : isRejected
                ? 'bg-red-50 border-b border-red-200'
                : 'bg-orange-50 border-b border-orange-200'
            }`}
          >
            <ExclamationCircleIcon
              className={`w-5 h-5 ${
                isPending
                  ? 'text-yellow-600'
                  : isRejected
                  ? 'text-red-600'
                  : 'text-orange-600'
              }`}
            />
            <p
              className={`text-sm ${
                isPending
                  ? 'text-yellow-800'
                  : isRejected
                  ? 'text-red-800'
                  : 'text-orange-800'
              }`}
            >
              {isPending &&
                'Your vendor application is pending approval. You will be notified once approved.'}
              {isRejected &&
                'Your vendor application was rejected. Please contact support for more information.'}
              {isSuspended &&
                'Your vendor account has been suspended. Please contact support.'}
            </p>
          </div>
        )}

        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
