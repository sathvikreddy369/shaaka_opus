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
          const { accessToken, user } = response.data;
          setAccessToken(accessToken);
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
          const user = response.data.user;
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
        set({ user: response.data.user });
      },

      setLocation: async (lat, lng) => {
        const response = await authAPI.setLocation(lat, lng);
        const { isWithinDeliveryArea, user } = response.data;
        set({
          user,
          isLocationSet: isWithinDeliveryArea,
        });
        return isWithinDeliveryArea;
      },

      completeProfile: async (data) => {
        const response = await authAPI.completeProfile(data);
        set({ user: response.data.user });
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
