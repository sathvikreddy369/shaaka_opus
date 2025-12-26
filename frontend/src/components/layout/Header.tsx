'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ShoppingCartIcon,
  HeartIcon,
  UserIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore, useCartStore, useUIStore, useWishlistStore } from '@/store';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products' },
  { name: 'Categories', href: '/categories' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, isLocationSet } = useAuthStore();
  const { itemCount } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const {
    openSearch,
    openAuthModal,
    openLocationModal,
    openCartSidebar,
  } = useUIStore();

  // Don't show header on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-primary-600 text-white py-2 text-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <p className="truncate">🌿 Free delivery on orders above ₹500</p>
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={openLocationModal}
              className="flex items-center gap-1 hover:text-primary-100 transition-colors"
            >
              <MapPinIcon className="h-4 w-4" />
              {isLocationSet ? 'Delivery available' : 'Check delivery'}
            </button>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-full overflow-hidden flex items-center justify-center">
              <Image
                src="/logo.jpeg"
                alt="Shaaka Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span className="font-heading font-bold text-lg md:text-2xl text-primary-700">
              Shaaka
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`font-medium transition-colors hover:text-primary-600 ${
                  pathname === item.href ? 'text-primary-600' : 'text-gray-700'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-4">
            {/* Search */}
            <button
              onClick={openSearch}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-6 w-6" />
            </button>

            {/* Location - Mobile */}
            <button
              onClick={openLocationModal}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Location"
            >
              <MapPinIcon className={`h-6 w-6 ${isLocationSet ? 'text-primary-600' : ''}`} />
            </button>

            {/* Wishlist - Desktop */}
            <Link
              href="/wishlist"
              className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              aria-label="Wishlist"
            >
              <HeartIcon className="h-6 w-6" />
              {wishlistItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            {/* Cart - Desktop */}
            <button
              onClick={openCartSidebar}
              className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              aria-label="Cart"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* User - Desktop */}
            {isAuthenticated ? (
              <Link
                href="/account"
                className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Account"
              >
                <UserIcon className="h-6 w-6" />
              </Link>
            ) : (
              <button
                onClick={openAuthModal}
                className="hidden md:block btn-primary py-2 px-4"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
