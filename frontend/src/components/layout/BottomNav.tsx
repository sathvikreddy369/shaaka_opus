'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  Squares2X2Icon,
  ShoppingCartIcon,
  HeartIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  HeartIcon as HeartIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';
import { useAuthStore, useCartStore, useUIStore, useWishlistStore } from '@/store';

const navItems = [
  { name: 'Home', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
  { name: 'Products', href: '/products', icon: Squares2X2Icon, activeIcon: Squares2X2IconSolid },
  { name: 'Cart', href: '/cart', icon: ShoppingCartIcon, activeIcon: ShoppingCartIconSolid, badge: 'cart' },
  { name: 'Wishlist', href: '/wishlist', icon: HeartIcon, activeIcon: HeartIconSolid, badge: 'wishlist' },
  { name: 'Account', href: '/account', icon: UserIcon, activeIcon: UserIconSolid, auth: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { itemCount } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { openAuthModal } = useUIStore();

  // Don't show on admin pages or checkout
  if (pathname?.startsWith('/admin') || pathname === '/checkout') {
    return null;
  }

  const getBadgeCount = (badge?: string) => {
    if (badge === 'cart') return itemCount;
    if (badge === 'wishlist') return wishlistItems.length;
    return 0;
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.activeIcon : item.icon;
          const badgeCount = getBadgeCount(item.badge);

          // Handle auth-required items
          if (item.auth && !isAuthenticated) {
            return (
              <button
                key={item.name}
                onClick={openAuthModal}
                className="flex flex-col items-center justify-center flex-1 h-full relative"
              >
                <Icon className={`h-6 w-6 ${active ? 'text-primary-600' : 'text-gray-500'}`} />
                <span className={`text-xs mt-1 ${active ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                  Login
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <div className="relative">
                <Icon className={`h-6 w-6 ${active ? 'text-primary-600' : 'text-gray-500'}`} />
                {badgeCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-primary-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 ${active ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
