import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, setAccessToken } from '@/lib/api';

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

  // Actions
  setUser: (user: User | null) => void;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  setLocation: (lat: number, lng: number) => Promise<boolean>;
  completeProfile: (data: { name: string; email?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLocationSet: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLocationSet: !!user?.location?.isWithinDeliveryArea,
        }),

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
          });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          // Ignore logout errors
        } finally {
          setAccessToken(null);
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
          set({
            user: null,
            isAuthenticated: false,
            isLocationSet: false,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      updateProfile: async (data) => {
        const response = await authAPI.updateProfile(data);
        const user = response.data.data?.user || response.data.user;
        set({ user });
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
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        isLocationSet: state.isLocationSet,
      }),
    }
  )
);
