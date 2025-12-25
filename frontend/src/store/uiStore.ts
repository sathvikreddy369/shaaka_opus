import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  // Mobile menu
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;

  // Search
  isSearchOpen: boolean;
  searchQuery: string;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;

  // Auth modal
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'otp' | 'profile';
  authPhone: string;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'otp' | 'profile') => void;
  setAuthPhone: (phone: string) => void;

  // Location modal
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Cart sidebar
  isCartSidebarOpen: boolean;
  openCartSidebar: () => void;
  closeCartSidebar: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Mobile menu
  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),

  // Search
  isSearchOpen: false,
  searchQuery: '',
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Auth modal
  isAuthModalOpen: false,
  authModalMode: 'login',
  authPhone: '',
  openAuthModal: () => set({ isAuthModalOpen: true, authModalMode: 'login' }),
  closeAuthModal: () => set({ isAuthModalOpen: false, authModalMode: 'login', authPhone: '' }),
  setAuthModalMode: (mode) => set({ authModalMode: mode }),
  setAuthPhone: (phone) => set({ authPhone: phone }),

  // Location modal
  isLocationModalOpen: false,
  openLocationModal: () => set({ isLocationModalOpen: true }),
  closeLocationModal: () => set({ isLocationModalOpen: false }),

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // Auto remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  // Loading states
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  // Cart sidebar
  isCartSidebarOpen: false,
  openCartSidebar: () => set({ isCartSidebarOpen: true }),
  closeCartSidebar: () => set({ isCartSidebarOpen: false }),
}));
