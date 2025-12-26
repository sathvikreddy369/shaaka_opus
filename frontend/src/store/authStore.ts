import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI, setAccessToken, getAccessToken } from '@/lib/api';
import { clearAllCaches } from '@/lib/cachedApi';

export interface User {
  _id: string;
  phone: string;
  name?: string;
  email?: string;
  role: 'USER' | 'ADMIN';
  isProfileComplete: boolean;
  location?: {
    coordinates: [number, number];
    isWithinDeliveryArea: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocationSet: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  setLocation: (lat: number, lng: number) => Promise<boolean>;
  completeProfile: (data: { name: string; email?: string }) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLocationSet: false,
      isInitialized: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLocationSet: !!user?.location?.isWithinDeliveryArea,
        }),

      initializeAuth: async () => {
        // Check if we have a token and try to fetch profile
        const token = getAccessToken();
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        
        if (!token && !refreshToken) {
          set({ isInitialized: true, isAuthenticated: false, user: null });
          return;
        }

        try {
          set({ isLoading: true });
          const response = await authAPI.getProfile();
          const user = response.data.data?.user || response.data.user;
          set({
            user,
            isAuthenticated: true,
            isLocationSet: !!user.location?.isWithinDeliveryArea,
            isInitialized: true,
          });
        } catch (error) {
          // If profile fetch fails, tokens might be invalid
          set({
            user: null,
            isAuthenticated: false,
            isLocationSet: false,
            isInitialized: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const response = await authAPI.verifyOTP(phone, otp);
          const responseData = response.data.data || response.data;
          const { user, tokens } = responseData;
          setAccessToken(tokens.accessToken);
          // Store refresh token in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('refreshToken', tokens.refreshToken);
          }
          set({
            user,
            isAuthenticated: true,
            isLocationSet: !!user.location?.isWithinDeliveryArea,
            isInitialized: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
          if (refreshToken) {
            await authAPI.logout();
          }
        } catch (error) {
          // Ignore logout errors
        } finally {
          setAccessToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('refreshToken');
          }
          // Clear all API caches on logout
          clearAllCaches();
          set({
            user: null,
            isAuthenticated: false,
            isLocationSet: false,
          });
        }
      },

      fetchProfile: async () => {
        set({ isLoading: true });
        try {
          const response = await authAPI.getProfile();
          const user = response.data.data?.user || response.data.user;
          set({
            user,
            isAuthenticated: true,
            isLocationSet: !!user.location?.isWithinDeliveryArea,
          });
        } catch (error) {
          // Don't clear auth on error - token refresh will handle it
          console.error('Failed to fetch profile:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      updateProfile: async (data) => {
        // Store current auth state in case we need to preserve it
        const currentState = get();
        
        try {
          const response = await authAPI.updateProfile(data);
          const user = response.data.data?.user || response.data.user;
          // Only update user data, preserve authentication state
          set({ 
            user,
            isAuthenticated: true, // Ensure auth state is preserved
          });
        } catch (error) {
          // On error, don't modify auth state
          console.error('Failed to update profile:', error);
          throw error;
        }
      },

      setLocation: async (lat, lng) => {
        // Calculate distance from Hyderabad center (17.385, 78.4867)
        const R = 6371; // Earth's radius in km
        const dLat = (lat - 17.385) * Math.PI / 180;
        const dLon = (lng - 78.4867) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(17.385 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        const isWithinDeliveryArea = distance <= 25; // 25km radius
        
        // Store location in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('userLocation', JSON.stringify({ lat, lng, isWithinDeliveryArea }));
        }
        
        set({ isLocationSet: isWithinDeliveryArea });
        return isWithinDeliveryArea;
      },

      completeProfile: async (data) => {
        const response = await authAPI.completeProfile(data);
        const user = response.data.data?.user || response.data.user;
        set({ user, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        isLocationSet: state.isLocationSet,
        user: state.user, // Also persist user data
      }),
    }
  )
);
