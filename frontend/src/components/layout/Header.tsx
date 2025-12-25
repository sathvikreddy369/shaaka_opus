'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ShoppingCartIcon,
  HeartIcon,
  UserIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
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
  const { user, isAuthenticated, isLocationSet } = useAuthStore();
  const { itemCount } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const {
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
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
          <p>🌿 Free delivery on orders above ₹500</p>
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
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="font-heading font-bold text-xl md:text-2xl text-primary-700">
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
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search */}
            <button
              onClick={openSearch}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-6 w-6" />
            </button>

            {/* Wishlist */}
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

            {/* Cart */}
            <button
              onClick={openCartSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              aria-label="Cart"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* User */}
            {isAuthenticated ? (
              <Link
                href="/account"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                className={`block py-2 px-4 rounded-lg font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <hr className="my-4" />
            <button
              onClick={() => {
                closeMobileMenu();
                openLocationModal();
              }}
              className="flex items-center gap-2 py-2 px-4 text-gray-700"
            >
              <MapPinIcon className="h-5 w-5" />
              {isLocationSet ? 'Delivery available' : 'Check delivery location'}
            </button>
            {!isAuthenticated && (
              <button
                onClick={() => {
                  closeMobileMenu();
                  openAuthModal();
                }}
                className="w-full btn-primary mt-4"
              >
                Login / Sign up
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
